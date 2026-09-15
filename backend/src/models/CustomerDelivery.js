const mongoose = require('mongoose');

const CustomerDeliverySchema = new mongoose.Schema(
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
      required: [true, 'Delivery date is required'],
      index: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening'],
      required: [true, 'Shift is required'],
      index: true,
    },
    milkType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Mixed'],
      default: 'Mixed',
    },
    quantity: {
      type: Number,
      required: [true, 'Milk quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate per liter is required'],
      min: [0, 'Rate cannot be negative'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
    status: {
      type: String,
      enum: ['Delivered', 'Skipped', 'Returned', 'Changed Qty'],
      default: 'Delivered',
      index: true,
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

// Compound index for fast route sheet & ledger queries
CustomerDeliverySchema.index({ customerCode: 1, date: 1 });
CustomerDeliverySchema.index({ date: 1, shift: 1 });

module.exports = mongoose.model('CustomerDelivery', CustomerDeliverySchema);
