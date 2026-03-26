// db.js — robust and production-ready MongoDB connection handler

const mongoose = require('mongoose');
require('dotenv').config(); // ✅ Ensure .env is loaded

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    // ✅ Added recommended connection options
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // wait 10s before failing
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ✅ Add connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`🔴 Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('🟠 Mongoose disconnected');
    });

    // Gracefully close connection on app exit
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('⚫ Mongoose connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
