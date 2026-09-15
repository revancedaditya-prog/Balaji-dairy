const mongoose = require('mongoose');

const CustomerBillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerCode: {
      type: Number,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    billDate: {
      type: String,
      required: true,
    },
    totalLitres: {
      type: Number,
      default: 0,
    },
    milkAmount: {
      type: Number,
      default: 0,
    },
    previousBalance: {
      type: Number,
      default: 0,
    },
    paymentsReceived: {
      type: Number,
      default: 0,
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    finalPayable: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Generated', 'Sent', 'Paid', 'Partially Paid'],
      default: 'Generated',
    },
    deliveries: [
      {
        date: String,
        shift: String,
        quantity: Number,
        rate: Number,
        amount: Number,
        status: String,
      },
    ],
    notes: {
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

CustomerBillSchema.index({ customerCode: 1, billDate: -1 });

module.exports = mongoose.model('CustomerBill', CustomerBillSchema);
