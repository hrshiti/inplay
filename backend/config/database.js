const mongoose = require('mongoose');

// Ensure environment variables are loaded
require('dotenv').config();

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  console.error('Please create a .env file with MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
  process.exit(1);
}

// Connect to MongoDB with proper error handling
mongoose.connect(process.env.MONGODB_URI, {
  // Modern Mongoose doesn't need these deprecated options
})
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📍 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Failed:');
    console.error(`Error: ${err.message}`);
    console.error('Please check your MONGODB_URI in .env file');
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

module.exports = mongoose;
