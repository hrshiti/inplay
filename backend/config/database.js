const mongoose = require('mongoose');

// Ensure environment variables are loaded
require('dotenv').config();

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  console.error('Please create a .env file with MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
  process.exit(1);
}

// Connect to MongoDB with proper error handling & retry options
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    family: 4 // Use IPv4, skip IPv6 resolver delays on Windows
  })
    .then(() => {
      console.log('✅ MongoDB Connected Successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection Failed:');
      console.error(`Error: ${err.message}`);
      console.error('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB connection event error:', err.message || err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected - attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

module.exports = mongoose;
