const mongoose = require('mongoose');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const RateChart = require('../models/RateChart');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const logAudit = require('../utils/auditLogger');

const BACKUP_VERSION = '2.0';

exports.exportBackup = async (req, res) => {
  try {
    // Password hashes are included so restored non-active users can still log in.
    // This endpoint is owner-only and the backup file must be treated as sensitive.
    const [users, suppliers, milkEntries, rateCharts, payments, auditLogs] = await Promise.all([
      User.find({}).select('+password'), Supplier.find({}), MilkEntry.find({}), RateChart.find({}), Payment.find({}), AuditLog.find({}),
    ]);

    const backupData = {
      backupVersion: BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      collections: { users, suppliers, milkEntries, rateCharts, payments, auditLogs },
    };

    res.setHeader('Content-Disposition', `attachment; filename=balaji_dairy_backup_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Backup export failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to export database backup' });
  }
};

exports.restoreBackup = async (req, res) => {
  const { backupVersion, collections } = req.body || {};
  if (!collections || typeof collections !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid backup structure. Collections key missing.' });
  }

  const names = ['users', 'suppliers', 'milkEntries', 'rateCharts', 'payments', 'auditLogs'];
  for (const name of names) {
    if (collections[name] !== undefined && !Array.isArray(collections[name])) {
      return res.status(400).json({ success: false, message: `Invalid backup structure: ${name} must be an array` });
    }
  }

  const { users = [], suppliers = [], milkEntries = [], rateCharts = [], payments = [], auditLogs = [] } = collections;
  if (users.some((u) => !u.password)) {
    return res.status(400).json({
      success: false,
      message: 'This backup does not contain user password hashes and cannot safely restore user accounts. Create a new v2 backup first.',
    });
  }

  const session = await mongoose.startSession();
  try {
    const activeUserId = req.user._id;
    await session.withTransaction(async () => {
      const activeUser = await User.findById(activeUserId).session(session);
      if (!activeUser) throw new Error('Active owner account no longer exists');

      // Keep transaction operations sequential; parallel operations inside a MongoDB
      // transaction are not supported reliably by the driver.
      await User.deleteMany({ _id: { $ne: activeUserId } }, { session });
      await Supplier.deleteMany({}, { session });
      await MilkEntry.deleteMany({}, { session });
      await RateChart.deleteMany({}, { session });
      await Payment.deleteMany({}, { session });
      await AuditLog.deleteMany({}, { session });

      const insertUsers = users.filter((u) => String(u._id) !== String(activeUserId));
      if (insertUsers.length) await User.insertMany(insertUsers, { session });
      if (suppliers.length) await Supplier.insertMany(suppliers, { session });
      if (milkEntries.length) await MilkEntry.insertMany(milkEntries, { session });
      if (rateCharts.length) await RateChart.insertMany(rateCharts, { session });
      if (payments.length) await Payment.insertMany(payments, { session });
      if (auditLogs.length) await AuditLog.insertMany(auditLogs, { session });
    });

    await logAudit(`${req.user.name} (${req.user.phone})`, 'DATABASE_RESTORE', `Database restored from backup version ${backupVersion || 'unknown'}`);
    return res.status(200).json({
      success: true,
      message: 'Database backup restored successfully',
      stats: { users: users.length, suppliers: suppliers.length, milkEntries: milkEntries.length, rateCharts: rateCharts.length, payments: payments.length, auditLogs: auditLogs.length },
    });
  } catch (error) {
    console.error('Backup restore failed:', error);
    return res.status(500).json({ success: false, message: 'Restore failed. Existing data was left unchanged.' });
  } finally {
    await session.endSession();
  }
};
