const AuditLog = require('../models/AuditLog');
const { safeRegex } = require('../utils/validation');
const { sendControllerError } = require('../utils/http');

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
      query.user = safeRegex(user);
    }

    if (search) {
      query.$or = [
        { user: safeRegex(search) },
        { action: safeRegex(search) },
        { target: safeRegex(search) },
      ];
    }

    // Fetch latest logs (limit to 200 for UI speed)
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(200);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    sendControllerError(res, error);
  }
};
