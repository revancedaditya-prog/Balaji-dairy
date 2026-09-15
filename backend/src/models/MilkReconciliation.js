const mongoose = require('mongoose');

const MilkReconciliationSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Date is required'],
      index: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Full Day'],
      default: 'Full Day',
      index: true,
    },
    openingMilk: {
      type: Number,
      default: 0,
    },
    farmerCollection: {
      type: Number,
      default: 0,
    },
    otherIncoming: {
      type: Number,
      default: 0,
    },
    totalAvailable: {
      type: Number,
      default: 0,
    },
    customerSales: {
      type: Number,
      default: 0,
    },
    internalUse: {
      type: Number,
      default: 0,
    },
    wastage: {
      type: Number,
      default: 0,
    },
    closingMilk: {
      type: Number,
      default: 0,
    },
    totalAccounted: {
      type: Number,
      default: 0,
    },
    variance: {
      type: Number,
      default: 0,
    },
    variancePercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Balanced', 'Acceptable', 'Excess Variance'],
      default: 'Balanced',
    },
    notes: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

MilkReconciliationSchema.index({ date: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('MilkReconciliation', MilkReconciliationSchema);
