const express = require('express');
const router = express.Router();

// Import controllers
const adminAuthController = require('../controllers/adminAuthController');
const contentController = require('../controllers/contentController');

const adminUserController = require('../controllers/adminUserController');
const analyticsController = require('../controllers/analyticsController');

// Import middlewares
const { protect, authorize } = require('../middlewares/auth');

// Import validators
const { validateAdminLogin } = require('../validators/authValidators');

// Auth routes (no auth required)
router.post('/auth/login', validateAdminLogin, adminAuthController.adminLogin);

// Protected routes (auth required)
router.use(protect); // All routes below require authentication
router.use(authorize('admin')); // All routes below require admin role

// Auth routes (protected)
router.get('/auth/profile', adminAuthController.getAdminProfile);
router.put('/auth/profile', adminAuthController.updateAdminProfile);
router.put('/auth/change-password', adminAuthController.changeAdminPassword);
router.post('/auth/logout', adminAuthController.adminLogout);

// Content management routes
router.get('/content', contentController.getAllContent);
router.get('/content/analytics', contentController.getContentAnalytics);
router.get('/content/:id', contentController.getContent);
router.post('/content', contentController.createContent);
router.put('/content/:id', contentController.updateContent);
router.patch('/content/:id/status', contentController.toggleContentStatus);
router.delete('/content/:id', contentController.deleteContent);


// User management routes
router.get('/users', adminUserController.getAllUsers);
router.get('/users/analytics', adminUserController.getUserAnalytics);
router.get('/users/:id', adminUserController.getUser);
router.patch('/users/:id/status', adminUserController.updateUserStatus);
router.delete('/users/:id', adminUserController.deleteUser);

// Analytics routes
router.get('/analytics/dashboard', analyticsController.getDashboardAnalytics);
router.get('/analytics/users', analyticsController.getUserAnalytics);
router.get('/analytics/content', analyticsController.getContentAnalytics);
router.get('/analytics/activity', analyticsController.getRecentActivity);

// Subscription Plan routes
const subscriptionController = require('../controllers/subscriptionController');
router.get('/subscription/plans', subscriptionController.getPlans);
router.post('/subscription/plans', subscriptionController.createPlan);
router.put('/subscription/plans/:id', subscriptionController.updatePlan);
router.delete('/subscription/plans/:id', subscriptionController.deletePlan);
router.get('/subscription/active', subscriptionController.getActiveSubscriptions);

// Notification routes
const notificationController = require('../controllers/notificationController');
router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/send-all', notificationController.sendToAll);
router.post('/notifications/send-subscribed', notificationController.sendToSubscribed);
router.post('/notifications/send-user', notificationController.sendToUser);

module.exports = router;
