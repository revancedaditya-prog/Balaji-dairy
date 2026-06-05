const User = require('../models/User');
const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const RateChart = require('../models/RateChart');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const logAudit = require('../utils/auditLogger');

// @desc    Export a backup of the database
// @route   GET /api/backup/export
// @access  Private
exports.exportBackup = async (req, res) => {
  try {
    const users = await User.find({});
    const suppliers = await Supplier.find({});
    const milkEntries = await MilkEntry.find({});
    const rateCharts = await RateChart.find({});
    const payments = await Payment.find({});
    const auditLogs = await AuditLog.find({});

    const backupData = {
      backupVersion: '1.0',
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

    res.setHeader('Content-disposition', `attachment; filename=balaji_dairy_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Import/Restore a backup of the database
// @route   POST /api/backup/restore
// @access  Private
exports.restoreBackup = async (req, res) => {
  try {
    const { collections } = req.body;

    if (!collections) {
      return res.status(400).json({ success: false, message: 'Invalid backup structure. Collections key missing.' });
    }

    const { users, suppliers, milkEntries, rateCharts, payments, auditLogs } = collections;

    // 1. Wipe current collections (except we preserve the active logging user to avoid locking ourselves out!)
    const activeUserId = req.user._id;
    const activeUser = await User.findById(activeUserId);

    // Perform deletions
    await User.deleteMany({ _id: { $ne: activeUserId } });
    await Supplier.deleteMany({});
    await MilkEntry.deleteMany({});
    await RateChart.deleteMany({});
    await Payment.deleteMany({});
    await AuditLog.deleteMany({});

    // 2. Perform insertions
    if (users && users.length > 0) {
      // Filter out the active logging user if present in the backup list to avoid duplicate key error
      const insertUsers = users.filter((u) => u._id.toString() !== activeUserId.toString());
      if (insertUsers.length > 0) {
        await User.insertMany(insertUsers);
      }
    }

    if (suppliers && suppliers.length > 0) {
      await Supplier.insertMany(suppliers);
    }

    if (milkEntries && milkEntries.length > 0) {
      await MilkEntry.insertMany(milkEntries);
    }

    if (rateCharts && rateCharts.length > 0) {
      await RateChart.insertMany(rateCharts);
    }

    if (payments && payments.length > 0) {
      await Payment.insertMany(payments);
    }

    if (auditLogs && auditLogs.length > 0) {
      await AuditLog.insertMany(auditLogs);
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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
