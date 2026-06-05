const AuditLog = require('../models/AuditLog');

/**
 * Log an audit action to the database
 * @param {string} user - User detail (e.g. "Aditya (9876543210)")
 * @param {string} action - Action name (e.g., 'SUPPLIER_ADD', 'MILK_ENTRY_EDIT')
 * @param {string} target - Target element (e.g., 'Supplier Code #105')
 * @param {object} oldValue - State before modification (optional)
 * @param {object} newValue - State after modification (optional)
 */
const logAudit = async (user, action, target, oldValue = null, newValue = null) => {
  try {
    await AuditLog.create({
      user,
      action,
      target,
      oldValue,
      newValue,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit Log saving failed:', error.message);
  }
};

module.exports = logAudit;
