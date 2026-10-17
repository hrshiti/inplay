// Simple test script to verify backend setup
const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inplay-ott-test');
    console.log('✅ MongoDB connected successfully');

    // Test models
    const User = require('./models/User');
    const Content = require('./models/Content');
    const SubscriptionPlan = require('./models/SubscriptionPlan');

    console.log('✅ Models loaded successfully');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    console.log('\n🎉 Backend setup verification completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your .env file with actual credentials');
    console.log('2. Start MongoDB server');
    console.log('3. Run: npm run dev');
    console.log('4. Test API endpoints at http://localhost:5000');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Check environment variables
const checkEnvironment = () => {
  console.log('Checking environment variables...');

  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'BACKEND_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('   Please configure your .env file');
  } else {
    console.log('✅ All required environment variables are set');
  }
};

// Run tests
const runTests = async () => {
  console.log('🚀 Starting InPlay Backend Tests\n');

  checkEnvironment();
  console.log('');

  await testConnection();
};

if (require.main === module) {
  runTests();
}

module.exports = { testConnection, checkEnvironment };
