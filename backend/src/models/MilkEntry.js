const mongoose = require('mongoose');

const MilkEntrySchema = new mongoose.Schema(
  {
    supplierCode: { type: Number, required: [true, 'Supplier code is required'], index: true, min: 1 },
    supplierName: { type: String, required: [true, 'Supplier name is required'], trim: true },
    date: { type: String, required: [true, 'Date is required'], index: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD'] },
    time: { type: String, required: [true, 'Time is required'], match: [/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, 'Time must use HH:MM or HH:MM:SS'] },
    shift: { type: String, enum: ['Morning', 'Evening'], required: [true, 'Shift is required'], index: true },
    milkQuantity: { type: Number, required: [true, 'Milk quantity is required'], min: [0.01, 'Milk quantity must be greater than zero'] },
    fat: { type: Number, default: 0, min: [0, 'FAT cannot be negative'] },
    snf: { type: Number, default: 0, min: [0, 'SNF cannot be negative'] },
    rate: { type: Number, default: 0, min: [0, 'Rate cannot be negative'] },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be greater than zero'] },
    remarks: { type: String, default: '', trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MilkEntrySchema.index({ supplierCode: 1, date: 1 });
MilkEntrySchema.index({ date: 1, shift: 1 });

module.exports = mongoose.model('MilkEntry', MilkEntrySchema);
