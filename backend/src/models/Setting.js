const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
  {
    dairyName: {
      type: String,
      default: 'BALAJI DAIRY',
    },
    dairyHindiName: {
      type: String,
      default: 'श्री बालाजी डेयरी',
    },
    tagline: {
      type: String,
      default: 'Fresh Milk & Dairy Products',
    },
    ownerName: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    fssaiNumber: {
      type: String,
      default: '',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    billFooterNotes: {
      type: String,
      default: 'Thank you for your business! Please settle pending balance by due date.',
    },
    morningShiftStart: {
      type: String,
      default: '05:00',
    },
    eveningShiftStart: {
      type: String,
      default: '16:00',
    },
    varianceToleranceLiters: {
      type: Number,
      default: 5,
    },
    defaultCowRate: {
      type: Number,
      default: 45,
    },
    defaultBuffaloRate: {
      type: Number,
      default: 65,
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', SettingSchema);
