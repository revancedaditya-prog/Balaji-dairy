const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ Database Connection Error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  // Safety guard: Prevent connecting to localhost/127.0.0.1 in production
  if (process.env.NODE_ENV === 'production' && 
     (process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1'))) {
    console.error('❌ Database Connection Error: Cannot connect to localhost/127.0.0.1 database in production mode.');
    process.exit(1);
  }

  const options = {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB Atlas Connected');

    // Connection event listeners for automatic reconnection and errors
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected to Atlas.');
    });
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️ Server will stay running in development mode. Please ensure your IP is whitelisted in MongoDB Atlas or use Supabase.');
    }
  }
};

module.exports = connectDB;
