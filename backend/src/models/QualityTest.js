const mongoose = require('mongoose');

const QualityTestSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: Number,
      required: [true, 'Supplier code is required'],
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Test date is required'],
      index: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening'],
      default: 'Morning',
      index: true,
    },
    fat: {
      type: Number,
      default: 0,
    },
    snf: {
      type: Number,
      default: 0,
    },
    clr: {
      type: Number,
      default: 0,
    },
    temperature: {
      type: Number,
      default: 0,
    },
    acidity: {
      type: Number,
      default: 0,
    },
    waterAdulteration: {
      type: Number,
      default: 0,
    },
    neutralizer: {
      type: String,
      enum: ['Negative', 'Positive'],
      default: 'Negative',
    },
    urea: {
      type: String,
      enum: ['Negative', 'Positive'],
      default: 'Negative',
    },
    starch: {
      type: String,
      enum: ['Negative', 'Positive'],
      default: 'Negative',
    },
    detergent: {
      type: String,
      enum: ['Negative', 'Positive'],
      default: 'Negative',
    },
    status: {
      type: String,
      enum: ['Passed', 'Warning', 'Rejected'],
      default: 'Passed',
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

QualityTestSchema.index({ supplierCode: 1, date: -1 });

module.exports = mongoose.model('QualityTest', QualityTestSchema);
