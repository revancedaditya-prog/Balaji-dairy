const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: Number,
      required: [true, 'Customer code is required'],
      unique: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    village: {
      type: String,
      trim: true,
      index: true,
    },
    customerType: {
      type: String,
      enum: ['Household', 'Shop', 'Hotel', 'Restaurant', 'Sweet Shop', 'Institution', 'Other'],
      default: 'Household',
    },
    milkType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Mixed'],
      default: 'Mixed',
    },
    morningDefaultQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    eveningDefaultQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaultRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    billingCycle: {
      type: String,
      enum: ['Daily', 'Weekly', '10-day', 'Monthly', 'Custom'],
      default: 'Monthly',
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Customer', CustomerSchema);
