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

  // Force webview_intent for all Android devices to ensure deep-linking works across all mobile browsers
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isWebView = isAndroid && (/wv|WebView/i.test(ua) || !/Chrome\/[.0-9]* Mobile/i.test(ua));
  
  const options = {
    key: key,
    name: name,
    description: description,
    image: 'https://inplay.com/logo.png',
    
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
      webview_intent: isAndroid // Force true on Android for highest success rate
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
    },
    // Advanced UI Configuration to show individual UPI apps as cards
    config: {
      display: {
        blocks: {
          upi: {
            name: "Pay via UPI",
            instruments: [
              { method: "upi", flows: ["intent", "collect", "qr"] }
            ]
          }
        },
        sequence: ["block.upi"],
        preferences: {
          show_default_blocks: true // This allows other methods like cards to show below
        }
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
};
