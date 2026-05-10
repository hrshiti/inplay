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
router.post('/auth/request-otp', userAuthController.requestLoginOtp);
router.post('/auth/verify-otp', userAuthController.verifyLoginOtp);

// Subscription Webhook (Public)
const subscriptionController = require('../controllers/subscriptionController');
router.post('/subscription/webhook', subscriptionController.handleWebhook);

// Protected routes (auth required)
router.use(protect); // All routes below require authentication

// Auth routes (protected)
router.get('/auth/profile', userAuthController.getUserProfile);
router.put('/auth/profile', userAuthController.updateUserProfile);
router.put('/auth/avatar', userAuthController.uploadAvatar);
router.put('/auth/change-password', userAuthController.changeUserPassword);
router.put('/auth/preferences', userAuthController.updateUserPreferences);
router.delete('/auth/profile', userAuthController.deleteUserAccount);
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

// Subscription routes
router.get('/plans', subscriptionController.getPlans);
router.get('/subscription/status', subscriptionController.getSubscriptionDetails);
router.post('/subscription/create', subscriptionController.createSubscription);
router.post('/subscription/verify', subscriptionController.verifySubscription);
router.post('/subscription/cancel', subscriptionController.cancelSubscription);

module.exports = router;
