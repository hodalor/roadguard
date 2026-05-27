const mongoose = require('mongoose');

async function connectDb() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('MONGO_URI not set. Starting server without a database connection.');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || 'roadguide',
    });
    console.log(`MongoDB connected successfully (${mongoose.connection.name})`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
}

module.exports = connectDb;
