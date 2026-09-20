const mongoose = require('mongoose');
const { isIsoDate, isTime } = require('../utils/validation');

const MilkEntrySchema = new mongoose.Schema(
  {
    supplierCode: {
      type: Number,
      required: [true, 'Supplier code is required'],
      min: [1, 'Supplier code must be greater than zero'],
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
    },
    date: {
      type: String, // Stored as 'YYYY-MM-DD' for robust and fast range querying
      required: [true, 'Date is required'],
      validate: { validator: isIsoDate, message: 'Date must be a valid YYYY-MM-DD date' },
      index: true,
    },
    time: {
      type: String, // Stored as 'HH:MM:SS' or 'HH:MM'
      required: [true, 'Time is required'],
      validate: { validator: isTime, message: 'Time must use HH:MM or HH:MM:SS format' },
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
      min: [0.01, 'Milk quantity must be greater than zero'],
    },
    fat: {
      type: Number,
      default: 0,
      min: [0, 'Fat cannot be negative'],
    },
    snf: {
      type: Number,
      default: 0,
      min: [0, 'SNF cannot be negative'],
    },
    rate: {
      type: Number,
      default: 0,
      min: [0, 'Rate cannot be negative'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
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
