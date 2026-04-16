/**
 * Razorpay Utility for handling payments and UPI Intent
 */

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const initRazorpayPayment = async ({
  key,
  subscriptionId,
  orderId,
  amount,
  name = 'InPlay OTT',
  description = 'Premium Subscription',
  prefill = {},
  handler,
  modal = {},
  theme = { color: '#7c3aed' }
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load');
  }

  // Auto-detect WebView for UPI Intent support
  const ua = navigator.userAgent;
  const isWebView = /wv|WebView|Android/i.test(ua) && !/Chrome\/[.0-9]* Mobile/i.test(ua);
  
  const options = {
    key: key,
    name: name,
    description: description,
    image: 'https://inplay.com/logo.png',
    
    // Use either subscription_id or order_id
    subscription_id: subscriptionId,
    order_id: orderId,
    amount: amount,

    handler: handler,
    prefill: prefill,
    theme: theme,
    modal: modal,

    // UPI Intent & Mobile Optimization
    redirect: true,
    upi_config: {
      webview_intent: isWebView
    },
    upi: {
      allow_intent: true
    },
    method: {
      upi: true,
      card: true,
      netbanking: true,
      wallet: true
    },
    retry: {
      enabled: true,
      max_count: 3
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
};
