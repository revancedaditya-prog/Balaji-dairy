const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private
exports.getLogs = async (req, res) => {
  const { action, user, search } = req.query;

  try {
    let query = {};

    if (action) {
      query.action = action;
    }

    if (user) {
      query.user = new RegExp(user, 'i');
    }

    if (search) {
      query.$or = [
        { user: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') },
        { target: new RegExp(search, 'i') },
      ];
    }

    // Fetch latest logs (limit to 200 for UI speed)
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(200);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
