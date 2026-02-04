const express = require('express');
const router = express.Router();

// Import controllers
const userAuthController = require('../controllers/userAuthController');
const userContentController = require('../controllers/userContentController');

// Import middlewares
const { protect } = require('../middlewares/auth');

// Import validators
const { validateUserRegistration, validateUserLogin } = require('../validators/authValidators');

// Auth routes (no auth required)
router.post('/auth/register', validateUserRegistration, userAuthController.registerUser);
router.post('/auth/login', validateUserLogin, userAuthController.loginUser);

// Protected routes (auth required)
router.use(protect); // All routes below require authentication

// Auth routes (protected)
router.get('/auth/profile', userAuthController.getUserProfile);
router.put('/auth/profile', userAuthController.updateUserProfile);
router.put('/auth/avatar', userAuthController.uploadAvatar);
router.put('/auth/change-password', userAuthController.changeUserPassword);
router.put('/auth/preferences', userAuthController.updateUserPreferences);
router.post('/auth/my-list/:contentId', userAuthController.addToMyList);
router.delete('/auth/my-list/:contentId', userAuthController.removeFromMyList);
router.post('/auth/like/:contentId', userAuthController.toggleLike);
router.get('/auth/watch-history', userAuthController.getWatchHistory);
router.delete('/auth/history/:contentId', userAuthController.removeFromHistory);
router.delete('/auth/history', userAuthController.clearHistory);
router.post('/auth/logout', userAuthController.logoutUser);
router.post('/auth/fcm-token', userAuthController.saveFCMToken);
router.delete('/auth/fcm-token', userAuthController.removeFCMToken);

// Content routes
router.get('/my-list', userContentController.getMyList);
router.post('/watch-history', userContentController.updateWatchHistory);

// Subscription and payment routes are handled in paymentRoutes.js

module.exports = router;
