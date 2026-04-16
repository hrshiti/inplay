/**
 * Razorpay Payment Integration Utility
 * Handles Razorpay payment initialization and verification
 */

let razorpayLoaded = false;

const isProbablyWebView = () => {
  try {
    const ua = String(navigator?.userAgent || "");
    // Common WebView indicators for Flutter/Hybrid apps
    const isAndroid = /Android/i.test(ua);
    const hasWv = /\bwv\b/i.test(ua);
    const hasVersion = /Version\/\d+/i.test(ua);
    const hasSafari = /Safari/i.test(ua);
    const isIOSWebView = /iPhone|iPad|iPod/i.test(ua) && !hasSafari;
    return (isAndroid && (hasWv || hasVersion)) || isIOSWebView || !!window.flutter_inappwebview;
  } catch {
    return false;
  }
};

/**
 * Load Razorpay checkout script
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (razorpayLoaded) {
      resolve();
      return;
    }

    if (window.Razorpay) {
      razorpayLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      razorpayLoaded = true;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay script'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay payment
 */
export const initRazorpayPayment = async (options) => {
  try {
    await loadRazorpayScript();

    if (!window.Razorpay) {
      throw new Error('Razorpay SDK not available');
    }

    const razorpayOptions = {
      key: options.key,
      // For App B: Support both subscription_id and order_id/amount
      subscription_id: options.subscriptionId || options.subscription_id,
      amount: options.amount,
      currency: options.currency || 'INR',
      order_id: options.orderId || options.order_id,
      
      name: options.name || 'InPlay OTT',
      description: options.description || 'Premium Subscription',
      image: options.image || 'https://inplay.com/logo.png',
      
      // Explicitly enable UPI and others
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: true,
        paylater: true,
      },
      
      // Mandatory for UPI Intent inside Flutter WebView
      redirect: true,
      webview_intent: true, // Forced true for Flutter hybrid app context
      
      upi: {
        allow_intent: true,
        flow: 'intent'
      },

      prefill: {
        name: options.prefill?.name || '',
        email: options.prefill?.email || '',
        contact: options.prefill?.contact || ''
      },
      
      notes: options.notes || {},
      theme: {
        color: options.theme?.color || '#7c3aed'
      },
      
      handler: function(response) {
        if (options.handler) {
          options.handler(response);
        }
      },
      
      modal: {
        ondismiss: function() {
          if (options.onClose) {
            options.onClose();
          } else if (options.modal?.ondismiss) {
            options.modal.ondismiss();
          }
        },
        escape: true,
        animation: true
      },

      retry: {
        enabled: true,
        max_count: 3
      },

      // App A Reference Config: Priority for UPI Apps Icons
      config: {
        display: {
          blocks: {
            upi: {
              name: "Pay via UPI",
              instruments: [
                { 
                  method: "upi",
                  apps: ["google_pay", "phonepe", "paytm", "cred"] 
                }
              ]
            }
          },
          sequence: ["block.upi", "block.card", "block.netbanking", "block.wallet"],
          preferences: {
            show_default_blocks: true,
            show_recommended_instruments: true
          }
        }
      }
    };

    const razorpay = new window.Razorpay(razorpayOptions);
    
    razorpay.on('payment.failed', function(response) {
      console.error('Razorpay payment failed:', response);
      if (options.onError) options.onError(response.error);
    });

    razorpay.open();
    return razorpay;
  } catch (error) {
    console.error('Error initializing Razorpay:', error);
    if (options.onError) options.onError(error);
    throw error;
  }
};
