require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const RateChart = require('../models/RateChart');
const Supplier = require('../models/Supplier');
const MilkEntry = require('../models/MilkEntry');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }
  console.log('Connecting to MongoDB Atlas...');
  return mongoose.connect(uri);
};

const seed = async () => {
  try {
    await connectDB();
    console.log('MongoDB connection established.');

    // 1. Seed Owner
    console.log('Seeding owner...');
    // Clear existing owners
    await User.deleteMany({ role: 'owner' });

    const owner = new User({
      name: 'Balaji Owner',
      phone: '9876543210',
      password: 'BalajiOwner123', // Will be hashed by pre-save middleware
      role: 'owner',
      status: 'active',
    });

    await owner.save();
    console.log('Owner seeded: Phone "9876543210", Password "BalajiOwner123"');

    // 2. Seed Rate Chart
    console.log('Seeding Rate Chart matrix...');
    await RateChart.deleteMany({});

    const rates = [];
    // FAT: 3.0 to 10.0 in 0.1 increments
    // SNF: 7.0 to 10.0 in 0.1 increments
    for (let f = 3.0; f <= 10.0; f = Math.round((f + 0.1) * 10) / 10) {
      for (let s = 7.0; s <= 10.0; s = Math.round((s + 0.1) * 10) / 10) {
        // Indian Dairy standard formula pricing calculation
        const rate = Math.round((f * 7.2 + s * 3.5) * 100) / 100;
        rates.push({ fat: f, snf: s, rate });
      }
    }

    const operations = rates.map((r) => ({
      insertOne: { document: r },
    }));

    // Run bulk write in batches of 1000 to keep it clean
    const batchSize = 1000;
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await RateChart.bulkWrite(batch);
    }
    console.log(`Rate chart seeded with ${rates.length} cells (FAT: 3.0-10.0, SNF: 7.0-10.0).`);

    // 3. Optional: Seed some mockup suppliers
    console.log('Seeding dummy suppliers for UI visibility...');
    await Supplier.deleteMany({});
    await MilkEntry.deleteMany({});
    await Payment.deleteMany({});
    await AuditLog.deleteMany({});

    const suppliers = [
      {
        supplierCode: 101,
        supplierName: 'Ramesh Patel',
        fatherName: 'Harish Patel',
        mobile: '9988776655',
        village: 'Viramgam',
        address: '12, Patel Vas, Viramgam',
        status: 'active',
        joiningDate: new Date('2026-01-10'),
      },
      {
        supplierCode: 102,
        supplierName: 'Sanjay Kumar',
        fatherName: 'Mohan Lal',
        mobile: '8877665544',
        village: 'Rampur',
        address: 'Opp. Temple, Rampur',
        status: 'active',
        joiningDate: new Date('2026-02-15'),
      },
      {
        supplierCode: 103,
        supplierName: 'Mahendra Singh',
        fatherName: 'Vikram Singh',
        mobile: '7766554433',
        village: 'Viramgam',
        address: 'Sardar Chowk, Viramgam',
        status: 'active',
        joiningDate: new Date('2026-03-01'),
      },
      {
        supplierCode: 104,
        supplierName: 'Rajesh Solanki',
        fatherName: 'Babubhai',
        mobile: '6655443322',
        village: 'Sanand',
        address: 'GIDC Colony, Sanand',
        status: 'inactive',
        joiningDate: new Date('2026-03-20'),
      },
    ];

    await Supplier.insertMany(suppliers);
    console.log('Dummy suppliers seeded.');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
