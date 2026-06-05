const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: String, // Stored as 'Name (Phone)' or 'Phone'
    required: true,
    index: true,
  },
  action: {
    type: String, // e.g., 'SUPPLIER_ADD', 'MILK_ENTRY_EDIT', etc.
    required: true,
    index: true,
  },
  target: {
    type: String, // e.g., 'Supplier Code #101'
    required: true,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
