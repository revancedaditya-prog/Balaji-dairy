const mongoose = require('mongoose');
const path = require('path');

// Resolve path to .env file in backend folder
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const User = require('./src/models/User');
const RateChart = require('./src/models/RateChart');

const runVerification = async () => {
  console.log('--- STARTING BALAJI DAIRY BACKEND VERIFICATION ---');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }
  console.log('Connecting to MongoDB Atlas...');

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Check Owner User
    const owner = await User.findOne({ role: 'owner', phone: '9876543210' });
    if (owner) {
      console.log(`✅ Owner User verified. Name: "${owner.name}", Phone: "${owner.phone}", Status: "${owner.status}"`);
    } else {
      console.log('❌ Owner User (phone: 9876543210) NOT found in the database. Please run "npm run seed" in the backend.');
    }

    // 2. Check Rate Chart Entries
    const rateCount = await RateChart.countDocuments();
    console.log(`✅ Rate Chart count: ${rateCount} cells.`);

    if (rateCount > 0) {
      // Test lookup for Fat: 6.5, SNF: 9.2
      // Formula: rate = fat * 7.2 + snf * 3.5 = 6.5 * 7.2 + 9.2 * 3.5 = 46.8 + 32.2 = 79.0
      const testLookup = await RateChart.findOne({ fat: 6.5, snf: 9.2 });
      if (testLookup) {
        console.log(`✅ Rate Chart Lookup successful for FAT: 6.5, SNF: 9.2. Rate is: ₹${testLookup.rate} (Expected: ₹79.0)`);
        if (testLookup.rate === 79.0) {
          console.log('✅ Pricing calculations formulas verify perfectly.');
        } else {
          console.log(`⚠️ Pricing formula mismatch. Found ₹${testLookup.rate}, expected ₹79.0`);
        }
      } else {
        console.log('❌ Rate Chart Lookup failed for FAT: 6.5, SNF: 9.2. Coordinates not seeded.');
      }
    } else {
      console.log('❌ Rate Chart is empty. Please run "npm run seed" in the backend.');
    }

    console.log('--- VERIFICATION COMPLETED ---');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection or query failed during verification:', error.message);
    process.exit(1);
  }
};

runVerification();
