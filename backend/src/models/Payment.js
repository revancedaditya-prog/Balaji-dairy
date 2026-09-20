const mongoose = require('mongoose');
const { isIsoDate } = require('../utils/validation');

const PaymentSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: Number,
      required: [true, 'Supplier code is required'],
      min: [1, 'Supplier code must be greater than zero'],
      index: true,
    },
    date: {
      type: String, // Stored as 'YYYY-MM-DD'
      required: [true, 'Payment date is required'],
      validate: { validator: isIsoDate, message: 'Payment date must be a valid YYYY-MM-DD date' },
      index: true,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0.01, 'Amount paid must be greater than zero'],
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    remarks: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for supplier ledger filtering
PaymentSchema.index({ supplierCode: 1, date: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
