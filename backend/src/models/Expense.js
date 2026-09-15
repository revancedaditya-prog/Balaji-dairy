const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Date is required'],
      index: true,
    },
    category: {
      type: String,
      enum: [
        'LPG',
        'Electricity',
        'Diesel',
        'Transport',
        'Labour',
        'Repairs',
        'Packaging',
        'Cleaning',
        'Milk Testing',
        'Maintenance',
        'Miscellaneous',
      ],
      required: [true, 'Expense category is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI / Online', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    description: {
      type: String,
      default: '',
    },
    billReference: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ date: -1, category: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
