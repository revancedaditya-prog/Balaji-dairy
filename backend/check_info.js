const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const checkInfo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log("Host:", mongoose.connection.host);
    console.log("Database:", mongoose.connection.name);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
};

checkInfo();
