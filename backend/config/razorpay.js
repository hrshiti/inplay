const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

if (!process.env.RAZORPAY_KEY_ID) console.error("FATAL: RAZORPAY_KEY_ID is missing");
if (!process.env.RAZORPAY_KEY_SECRET) console.error("FATAL: RAZORPAY_KEY_SECRET is missing");

// Create subscription order
const createSubscriptionOrder = async (plan, user) => {
  try {
    const options = {
      amount: Math.round(plan.price * 100), // Ensure integer (amount in paisa)
      currency: plan.currency || 'INR',
      receipt: `sub_${user._id}_${Date.now()}`.substring(0, 40),
      notes: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        planName: (plan.name || '').substring(0, 30),
        type: 'subscription'
      }
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Subscription Error Details:", JSON.stringify(error, null, 2));
    const msg = error.error ? error.error.description : (error.message || 'Unknown Razorpay error');
    throw new Error(`Failed to create subscription order: ${msg}`);
  }
};

// Create content purchase order
const createContentPurchaseOrder = async (content, user) => {
  try {
    if (!content.price || content.price <= 0) {
      throw new Error("Content price must be greater than 0");
    }

    const options = {
      amount: Math.round(content.price * 100), // Ensure integer
      currency: content.currency || 'INR',
      receipt: `content_${content._id}_${user._id}_${Date.now()}`.substring(0, 40), // Limit receipt headers if needed
      notes: {
        userId: user._id.toString(),
        contentId: content._id.toString(),
        contentTitle: (content.title || '').substring(0, 30), // Limit length
        type: 'content_purchase'
      }
    };

    console.log("Razorpay Request Options:", JSON.stringify(options));
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Content Order Error:", JSON.stringify(error, null, 2));
    const msg = error.error ? error.error.description : error.message;
    throw new Error(`Failed to create content purchase order: ${msg}`);
  }
};

// Verify payment signature
const verifyPayment = (orderId, paymentId, signature) => {
  try {
    const sign = orderId + '|' + paymentId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    return expectedSign === signature;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
};

// Refund payment
const refundPayment = async (paymentId, amount, reason = 'Customer request') => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paisa
      notes: {
        reason: reason
      }
    });
    return refund;
  } catch (error) {
    throw new Error(`Refund failed: ${error.message}`);
  }
};

// Get payment details
const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
};

// Create recurring subscription (for future use)
const createRecurringSubscription = async (plan, user) => {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_notify: 1,
      notes: {
        userId: user._id.toString(),
        planId: plan._id.toString()
      }
    });
    return subscription;
  } catch (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }
};

module.exports = {
  razorpay,
  createSubscriptionOrder,
  createContentPurchaseOrder,
  verifyPayment,
  refundPayment,
  getPaymentDetails,
  createRecurringSubscription
};
