const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for web clients)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password') ||
        await (require('../models/Admin')).findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check token version (Force Logout)
      if (user.tokenVersion !== undefined && decoded.tokenVersion !== undefined) {
        if (user.tokenVersion !== decoded.tokenVersion) {
          return res.status(401).json({
            success: false,
            message: 'FORCE_LOGOUT',
            reason: 'Session expired due to security update'
          });
        }
      }

      // Check force logout timestamp
      if (user.forceLogoutAt && decoded.iat) {
        // decoded.iat is in seconds, user.forceLogoutAt is a Date object
        // Add a 5000ms buffer to prevent false logouts due to JWT iat truncation
        if (decoded.iat * 1000 < user.forceLogoutAt.getTime() - 5000) {
          return res.status(401).json({
            success: false,
            message: 'FORCE_LOGOUT',
            reason: 'Session expired'
          });
        }
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};



// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user._id,
    tokenVersion: user.tokenVersion || 0
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send token response
const sendTokenResponse = async (user, statusCode, res, message = 'Success') => {
  // Create token
  const token = generateToken(user);

  // Update last login
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });

  // Remove password from user object for response
  const userObj = user.toObject();
  delete userObj.password;

  // Hydrate avatar URL if local
  if (userObj.avatar && userObj.avatar.startsWith('/')) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    userObj.avatar = `${backendUrl}${userObj.avatar}`;
  }

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      user: userObj
    }
  });
};

// Ensure user has an active subscription
const subscribed = (req, res, next) => {
  // Allow admins and dev testing numbers to bypass subscription check
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.phone === '6268204871' || req.user.phone === '6268455485')) {
    return next();
  }

  if (!req.user || !req.user.subscription || !req.user.subscription.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. An active subscription is required to access this feature.',
      errorCode: 'SUBSCRIPTION_REQUIRED'
    });
  }

  // Double check end date (fallback for cron/webhooks)
  if (req.user.subscription.endDate && new Date(req.user.subscription.endDate) < new Date()) {
    return res.status(403).json({
      success: false,
      message: 'Your subscription has expired. Please renew to continue.',
      errorCode: 'SUBSCRIPTION_EXPIRED'
    });
  }

  next();
};

// Optional protect - populate req.user if token exists but do not block if missing/invalid
const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password') ||
          await (require('../models/Admin')).findById(decoded.id).select('-password');

        if (user && user.isActive) {
          let tokenValid = true;
          if (user.tokenVersion !== undefined && decoded.tokenVersion !== undefined) {
            if (user.tokenVersion !== decoded.tokenVersion) {
              tokenValid = false;
            }
          }
          if (user.forceLogoutAt && decoded.iat) {
            if (decoded.iat * 1000 < user.forceLogoutAt.getTime() - 5000) {
              tokenValid = false;
            }
          }
          if (tokenValid) {
            req.user = user;
          }
        }
      } catch (err) {
        // Token verification failed, continue as guest
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  authorize,
  subscribed,
  optionalProtect,
  generateToken,
  sendTokenResponse
};

