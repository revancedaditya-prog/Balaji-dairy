const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    supplierCode: {
      type: Number,
      required: [true, 'Please add a supplier code'],
      min: [1, 'Supplier code must be greater than zero'],
      unique: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, 'Please add a supplier name'],
      trim: true,
    },
    fatherName: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^$|^\d{7,15}$/, 'Please add a valid mobile number'],
    },
    village: {
      type: String,
      required: [true, 'Please add a village name'],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Supplier', SupplierSchema);
