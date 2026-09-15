const mongoose = require('mongoose');

const CustomerPaymentSchema = new mongoose.Schema(
  {
    customerCode: {
      type: Number,
      required: [true, 'Customer code is required'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Payment date is required'],
      index: true,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid cannot be negative'],
    },
    discountOrAdjustment: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI / Online', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    remarks: {
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

CustomerPaymentSchema.index({ customerCode: 1, date: -1 });

module.exports = mongoose.model('CustomerPayment', CustomerPaymentSchema);
