const User = require('../models/User');
const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const RateChart = require('../models/RateChart');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const logAudit = require('../utils/auditLogger');
const mongoose = require('mongoose');
const { sendControllerError } = require('../utils/http');

const COLLECTION_NAMES = ['users', 'suppliers', 'milkEntries', 'rateCharts', 'payments', 'auditLogs'];

const validateCollections = (collections) => {
  if (!collections || typeof collections !== 'object' || Array.isArray(collections)) return false;
  return COLLECTION_NAMES.every((name) => collections[name] === undefined || Array.isArray(collections[name]));
};

// @desc    Export a backup of the database
// @route   GET /api/backup/export
// @access  Private
exports.exportBackup = async (req, res) => {
  try {
    // Password hashes are required to restore accounts. This endpoint is owner-only.
    const users = await User.find({}).select('+password');
    const suppliers = await Supplier.find({});
    const milkEntries = await MilkEntry.find({});
    const rateCharts = await RateChart.find({});
    const payments = await Payment.find({});
    const auditLogs = await AuditLog.find({});

    const backupData = {
      backupVersion: '1.1',
      timestamp: new Date().toISOString(),
      collections: {
        users,
        suppliers,
        milkEntries,
        rateCharts,
        payments,
        auditLogs,
      },
    };

    res.setHeader('Content-Disposition', `attachment; filename=balaji_dairy_backup_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Import/Restore a backup of the database
// @route   POST /api/backup/restore
// @access  Private
exports.restoreBackup = async (req, res) => {
  try {
    const { collections } = req.body;

    if (!validateCollections(collections)) {
      return res.status(400).json({ success: false, message: 'Invalid backup structure. Collection values must be arrays.' });
    }

    const { users, suppliers, milkEntries, rateCharts, payments, auditLogs } = collections;

    const activeUserId = req.user._id;
    const insertUsers = (users || []).filter((user) =>
      user?._id?.toString() !== activeUserId.toString() && typeof user?.password === 'string'
    );
    const skippedUsers = (users || []).length - insertUsers.length;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Preserve the active owner so a restore can never lock out the current session.
        await User.deleteMany({ _id: { $ne: activeUserId } }, { session });
        await Supplier.deleteMany({}, { session });
        await MilkEntry.deleteMany({}, { session });
        await RateChart.deleteMany({}, { session });
        await Payment.deleteMany({}, { session });
        await AuditLog.deleteMany({}, { session });

        if (insertUsers.length > 0) await User.insertMany(insertUsers, { session });
        if (suppliers?.length > 0) await Supplier.insertMany(suppliers, { session });
        if (milkEntries?.length > 0) await MilkEntry.insertMany(milkEntries, { session });
        if (rateCharts?.length > 0) await RateChart.insertMany(rateCharts, { session });
        if (payments?.length > 0) await Payment.insertMany(payments, { session });
        if (auditLogs?.length > 0) await AuditLog.insertMany(auditLogs, { session });
      });
    } finally {
      await session.endSession();
    }

    // Record audit of backup restore
    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'DATABASE_RESTORE',
      'Database successfully restored from JSON backup file'
    );

    res.status(200).json({
      success: true,
      message: 'Database backup restored successfully',
      stats: {
        users: (users || []).length,
        suppliers: (suppliers || []).length,
        milkEntries: (milkEntries || []).length,
        rateCharts: (rateCharts || []).length,
        payments: (payments || []).length,
        auditLogs: (auditLogs || []).length,
        skippedUsers,
      },
    });
  } catch (error) {
    sendControllerError(res, error);
  }
};
