const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables FIRST
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file in the backend directory with:');
  console.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
  console.error('   JWT_SECRET=your-super-secret-jwt-key');
  console.error('\n💡 Copy the content from ENV_SETUP.txt to create your .env file');
  process.exit(1);
}

// Connect to database AFTER environment variables are loaded
require('./config/database');

const app = express();

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const quickByteRoutes = require('./routes/quickByteRoutes');
const forYouRoutes = require('./routes/forYouRoutes');
const audioSeriesRoutes = require('./routes/audioSeriesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration (MUST BE BEFORE LIMITER)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'InPlay Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/quickbytes', quickByteRoutes);
app.use('/api/foryou', forYouRoutes);
app.use('/api/audio-series', audioSeriesRoutes);
app.use('/api/upload', uploadRoutes);


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Scheduled tasks
const startScheduledTasks = () => {
  // Clean expired downloads every 6 hours
  setInterval(async () => {
    try {
      const downloadService = require('./services/downloadService');
      const result = await downloadService.cleanExpiredDownloads();
      if (result.cleaned > 0) {
        console.log(`Cleaned ${result.cleaned} expired downloads`);
      }
    } catch (error) {
      console.error('Error cleaning expired downloads:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  // Update subscription statuses daily
  setInterval(async () => {
    try {
      const User = require('./models/User');
      const expiredCount = await User.updateMany(
        {
          'subscription.endDate': { $lt: new Date() },
          'subscription.isActive': true
        },
        {
          $set: { 'subscription.isActive': false }
        }
      );
      if (expiredCount.modifiedCount > 0) {
        console.log(`Updated ${expiredCount.modifiedCount} expired subscriptions`);
      }
    } catch (error) {
      console.error('Error updating subscription statuses:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours
};

// Import database connection (it will connect automatically)
require('./config/database');

// Connect to database and start server
const startServer = async () => {
  // Start scheduled tasks
  startScheduledTasks();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('Scheduled tasks started');
  });

  // Socket.IO Setup
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket Client Connected:', socket.id);

    socket.on('join_reel', (reelId) => {
      socket.join(reelId);
      console.log(`Socket ${socket.id} joined reel ${reelId}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket Disconnected:', socket.id);
    });
  });

  // Make io accessible globally via app set
  app.set('io', io);
};

startServer();

module.exports = app;
