const mongoose = require('mongoose');

const MilkEntrySchema = new mongoose.Schema(
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
      type: String, // Stored as 'YYYY-MM-DD' for robust and fast range querying
      required: [true, 'Date is required'],
      index: true,
    },
    time: {
      type: String, // Stored as 'HH:MM:SS' or 'HH:MM'
      required: [true, 'Time is required'],
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening'],
      required: [true, 'Shift is required'],
      index: true,
    },
    milkQuantity: {
      type: Number,
      required: [true, 'Milk quantity is required'],
    },
    fat: {
      type: Number,
      default: 0,
    },
    snf: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
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

// Compound indexes for report performance
MilkEntrySchema.index({ supplierCode: 1, date: 1 });
MilkEntrySchema.index({ date: 1, shift: 1 });

module.exports = mongoose.model('MilkEntry', MilkEntrySchema);
