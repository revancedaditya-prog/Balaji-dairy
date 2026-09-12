const mongoose = require('mongoose');

const RateChartSchema = new mongoose.Schema(
  {
    fat: { type: Number, required: true, min: [0, 'FAT cannot be negative'] },
    snf: { type: Number, required: true, min: [0, 'SNF cannot be negative'] },
    rate: { type: Number, required: true, min: [0, 'Rate cannot be negative'] },
  },
  { timestamps: true }
);

RateChartSchema.index({ fat: 1, snf: 1 }, { unique: true });

module.exports = mongoose.model('RateChart', RateChartSchema);
