const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const multer = require("multer");
const path = require("path");
const mm = require('music-metadata');
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
// Load environment variables FIRST
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL || 'https://api.inplays.in';

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
const database = require('./config/database');

// Debugging: Log static root path
console.log('📂 Static files root:', path.join(__dirname, 'uploads'));

const app = express();

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');

const quickByteRoutes = require('./routes/quickByteRoutes');
const forYouRoutes = require('./routes/forYouRoutes');
const audioSeriesRoutes = require('./routes/audioSeriesRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { convertImagesToWebpMiddleware } = require('./config/multerStorage');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

// SERVE STATIC FILES - All uploaded media (images, videos, audio)
// Moved before API routes to ensure they are handled properly
const fs = require('fs');
const sharp = require('sharp');

const onTheFlyWebpMiddleware = async (req, res, next) => {
  try {
    const urlPath = req.path; // e.g. "/images/avatars/img_123.jpg"
    
    // Check if request is for an image and not already webp
    const ext = path.extname(urlPath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'];
    
    if (imageExtensions.includes(ext)) {
      const uploadsDir = path.join(__dirname, 'uploads');
      const requestedLocalPath = path.join(uploadsDir, urlPath);
      
      // Corresponding webp local path
      const webpLocalPath = requestedLocalPath.replace(/\.[^/.]+$/, "") + ".webp";
      
      // Case A: The original requested file (e.g. .jpg) exists on disk
      if (fs.existsSync(requestedLocalPath)) {
        try {
          await sharp(requestedLocalPath)
            .webp({ quality: 80 })
            .toFile(webpLocalPath);
          
          // Delete original non-webp file to save disk space
          fs.unlinkSync(requestedLocalPath);
        } catch (err) {
          console.error("On-the-fly WebP conversion failed:", err);
        }
      }
      
      // Case B: The webp file exists (either just created or previously created), but original doesn't
      if (fs.existsSync(webpLocalPath)) {
        // Rewrite request URL so express.static serves the webp file
        req.url = req.url.replace(/\.[^/.]+$/, "") + ".webp";
      }
    }
  } catch (err) {
    console.error("Error in onTheFlyWebpMiddleware:", err);
  }
  next();
};

app.use('/uploads', onTheFlyWebpMiddleware);
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    // Ensure CORS headers for cross-origin media loading
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// CORS configuration
const allowedOrigins = [
  'https://inplay-two.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://inplays.in',
  'https://www.inplays.in',
  'https://ios.inplays.in'
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



// Body parsing middleware
app.use(express.json({ 
  limit: '10gb',
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

// Logging
const requestLogger = require('./middlewares/requestLogger');
app.use(requestLogger);
app.use(morgan('dev')); // Keep morgan 'dev' for a quick one-line summary in console

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'InPlay Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/admin/dynamic', require('./routes/adminTabRoutes'));
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);

app.use('/api/quickbytes', quickByteRoutes);
app.use('/api/foryou', forYouRoutes);
app.use('/api/audio-series', audioSeriesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/promotions', require('./routes/promotionRoutes'));
app.use('/api/app-settings', require('./routes/appSettingRoutes'));
app.use('/api/admin/app-settings', require('./routes/appSettingRoutes'));
app.use('/api/public', require('./routes/publicTabRoutes'));

// Static files middleware moved up to improve reliability and handle requests before API routing logic.

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
app.post("/upload", upload.single("file"), convertImagesToWebpMiddleware, async (req, res) => {
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
  // Generate full URL - Fix double slash issue
  const fileUrl = `${BACKEND_URL}/uploads${req.file.path.split("uploads")[1].replace(/\\/g, "/")}`;

  // Default response data
  let responseData = {
    message: "File uploaded successfully",
    relativePath,
    url: fileUrl
  };

  // Calculate duration if audio
  if (req.file.mimetype.startsWith("audio")) {
    try {
      const metadata = await mm.parseFile(req.file.path);
      responseData.duration = metadata.format.duration; // Duration in seconds
    } catch (err) {
      console.error("Error parsing audio metadata:", err.message);
      // We continue without duration if parsing fails
    }
  }

  res.json(responseData);
});

// Video Streaming Route (Range Requests)
app.get('/api/stream/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'videos', req.params.filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
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

};

// Database connection is already established at the top level
// require('./config/database');

// Connect to database and start server
const startServer = async () => {
  // Start scheduled tasks
  startScheduledTasks();
  
  // Start Subscription Transition Cron
  const { startSubscriptionCron } = require('./services/subscriptionCron');
  startSubscriptionCron();

  // Port is defined globally at the top
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('Scheduled tasks started');
  });

  // Increase timeout to 4 hours for large file uploads (10GB)
  server.setTimeout(4 * 60 * 60 * 1000);

  // Socket.IO Setup
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true // Support older socket.io clients if any
  });

  io.on('connection', (socket) => {
    console.log('Socket Client Connected:', socket.id);

    socket.on('join_reel', (reelId) => {
      socket.join(reelId);
      console.log(`Socket ${socket.id} joined reel ${reelId}`);
    });

    socket.on('register', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} registered to user room: ${userId}`);
      }
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
