const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require("multer");
const path = require("path");

// Load environment variables FIRST
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL;

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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

// CORS configuration (MUST BE BEFORE LIMITER)
const allowedOrigins = [
  'https://inplay-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://inplays.in',
  'https://www.inplays.in'
];

if (process.env.FRONTEND_URL) {
  // Clean up the env variable to ensure no trailing slash
  const url = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(url)) {
    allowedOrigins.push(url);
  }
}

// Debugging: Log allowed origins on startup
console.log('✅ Allowed CORS Origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ BLOCKED BY CORS: '${origin}'`); // Use console.error to ensure it shows in logs
      console.error(`   - Allowed: ${JSON.stringify(allowedOrigins)}`);
      callback(new Error(`Not allowed by CORS (Origin: ${origin})`));
    }
  },
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
app.use('/api/promotions', require('./routes/promotionRoutes'));

// SERVE STATIC FILES - All uploaded media (images, videos, audio)
// Files are stored in backend/uploads/ and served at /uploads/ URL path
// This makes files publicly accessible via: http://localhost:5001/uploads/...
// const path = require('path'); // Already imported at top
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------
// Multer Storage Setup
// -------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith("image"))
      cb(null, path.join(__dirname, "uploads/images"));
    else if (file.mimetype.startsWith("video"))
      cb(null, path.join(__dirname, "uploads/videos"));
    else if (file.mimetype.startsWith("audio"))
      cb(null, path.join(__dirname, "uploads/audio"));
    else
      cb(new Error("Unsupported file type"), null);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// -------------------
// Upload Route
// -------------------
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  // Generate relative path
  // Safeguard: use relative path from project root if 'backend/' isn't in path
  let relativePath = req.file.path;
  if (req.file.path.includes("backend")) {
    relativePath = req.file.path.split("backend")[1].replace(/\\/g, "/");
    // Ensure leading slash if missing after split
    if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
  } else {
    // Fallback relative to uploads if backend folder name differs
    relativePath = "/uploads/" + req.file.path.split("uploads")[1].replace(/\\/g, "/");
  }

  // Clean up relative path double slashes if any
  relativePath = relativePath.replace('//', '/');


  // Generate full URL
  const fileUrl = `${BACKEND_URL}/uploads/${req.file.path.split("uploads")[1].replace(/\\/g, "/")}`;

  res.json({
    message: "File uploaded successfully",
    relativePath,
    url: fileUrl
  });
});

// -------------------
// Test route for hydration
// -------------------
app.get("/test-upload", (req, res) => {
  res.json({
    exampleRelative: "/uploads/images/example.jpg",
    exampleUrl: `${BACKEND_URL}/uploads/images/example.jpg`
  });
});


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

  // Port is defined globally at the top
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('Scheduled tasks started');
  });

  // Socket.IO Setup
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
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
