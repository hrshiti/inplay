const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const subscriptionController = require('../controllers/subscriptionController');

// Public routes for subscription plans
router.get('/plans', subscriptionController.getAllPlans);
router.get('/plans/:id', subscriptionController.getPlan);

// User routes (require authentication)
const { protect } = require('../middlewares/auth');
router.use(protect);

// User payment routes
router.post('/create-content-order', paymentController.createContentPurchaseOrder);
router.post('/verify-content-payment', paymentController.verifyContentPurchasePayment);
router.get('/history', paymentController.getUserPaymentHistory);

// User subscription routes
router.post('/subscription/create-order', subscriptionController.createSubscriptionOrder);
router.post('/subscription/verify-payment', subscriptionController.verifySubscriptionPayment);
router.get('/subscription/status', subscriptionController.getUserSubscription);
router.delete('/subscription/cancel', subscriptionController.cancelSubscription);

// Admin routes (require admin role)
const { authorize } = require('../middlewares/auth');
router.use('/admin', authorize('admin'));

// Admin payment routes
router.get('/admin/analytics', paymentController.getPaymentAnalytics);
router.get('/admin/all', paymentController.getAllPayments);
router.post('/admin/:id/refund', paymentController.processRefund);
router.get('/admin/content-performance', paymentController.getPaidContentPerformance);

// Admin subscription routes
router.get('/admin/subscription/analytics', subscriptionController.getSubscriptionAnalytics);
router.post('/admin/subscription/plans', subscriptionController.createPlan);
router.put('/admin/subscription/plans/:id', subscriptionController.updatePlan);
router.delete('/admin/subscription/plans/:id', subscriptionController.deletePlan);

module.exports = router;
