const Razorpay = require('razorpay');

/**
 * Razorpay Service for managing backend instances and credentials
 */
class RazorpayService {
  constructor() {
    this.instance = null;
    this.currentKeyId = null;
  }

  /**
   * Get or Re-initialize Razorpay instance based on current .env credentials
   */
  getInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials missing in .env');
    }

    // Check if credentials changed to re-initialize instance
    if (!this.instance || this.currentKeyId !== keyId) {
      console.log('🔄 Initializing Razorpay Instance with Key ID:', keyId);
      this.instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      this.currentKeyId = keyId;
    }

    return this.instance;
  }
}

// Export a singleton instance
module.exports = new RazorpayService();
