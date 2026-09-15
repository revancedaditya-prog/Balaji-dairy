const mongoose = require('mongoose');

const InternalMilkUseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Date is required'],
      index: true,
    },
    shift: {
      type: String,
      enum: ['Morning', 'Evening', 'Full Day'],
      default: 'Morning',
      index: true,
    },
    purpose: {
      type: String,
      enum: ['Paneer', 'Khoya', 'Kulfi', 'Tea / Staff', 'Samples', 'Wastage', 'Other'],
      required: [true, 'Purpose is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Milk quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    fat: {
      type: Number,
      default: 0,
    },
    productOutputQty: {
      type: Number,
      default: 0,
    },
    productOutputUnit: {
      type: String,
      default: 'kg',
    },
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

InternalMilkUseSchema.index({ date: 1, shift: 1 });

module.exports = mongoose.model('InternalMilkUse', InternalMilkUseSchema);
