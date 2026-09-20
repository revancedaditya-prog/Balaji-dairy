const mongoose = require('mongoose');

const RateChartSchema = new mongoose.Schema(
  {
    fat: {
      type: Number,
      required: [true, 'Fat value is required'],
      min: [0, 'Fat cannot be negative'],
    },
    snf: {
      type: Number,
      required: [true, 'SNF value is required'],
      min: [0, 'SNF cannot be negative'],
    },
    rate: {
      type: Number,
      required: [true, 'Rate value is required'],
      min: [0, 'Rate cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique compound index for fat + snf combo
RateChartSchema.index({ fat: 1, snf: 1 }, { unique: true });

module.exports = mongoose.model('RateChart', RateChartSchema);
