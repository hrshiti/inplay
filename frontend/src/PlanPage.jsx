import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowRight, Star, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import authService from './services/api/authService';
import subscriptionService from './services/api/subscriptionService';
import { initRazorpayPayment } from './lib/utils/razorpay';
import HlsPlayer from './components/HlsPlayer';
import { getImageUrl } from './utils/imageUtils';
import { trackSubscriptionView, trackSubscriptionInitiated, trackSubscriptionPurchase, trackTrialInitiated, trackTrialPurchase } from './utils/analytics';

const PlanPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [isMuted, setIsMuted] = useState(true);

  const togglePlanDetails = (planId) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  useEffect(() => {
    fetchData();
    trackSubscriptionView();
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.phone === '6268204871' || currentUser.phone === '6268455485')) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      let profile = null;
      try {
        profile = await authService.getProfile();
      } catch (err) {
        // User not logged in
      }

      let allPlans = [];
      try {
        allPlans = await subscriptionService.getPlans();
      } catch (err) {
        console.warn('Could not fetch plans (maybe not logged in):', err.message);
      }

      const appSettings = await subscriptionService.getAppSettings();

      setPlans(allPlans.filter(p => p.isActive));
      setTrialSettings(appSettings?.subscriptionSettings);
      setCurrentUser(profile);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId, isTrial = false) => {
    try {
      setLoading(true);

      if (isTrial) {
        trackTrialInitiated({ planId });
      } else {
        trackSubscriptionInitiated({ planId });
      }

      // 1. Create Subscription on Backend
      const subData = await subscriptionService.createSubscription(planId, isTrial);

      // 2. Open Razorpay Checkout via central utility
      await initRazorpayPayment({
        key: subData.razorpayKeyId,
        subscriptionId: subData.subscriptionId,
        description: isTrial ? 'Pay Trial & Enable AutoPay' : `${subData.planName} Plan`,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || ''
        },
        modal: {
          ondismiss: () => setLoading(false)
        },
        handler: async function (response) {
          try {
            await subscriptionService.verifySubscription({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
            });

            if (isTrial) {
              trackTrialPurchase({ planId, price: subData.amount });
            } else {
              trackSubscriptionPurchase({ planId, price: subData.amount });
            }

            const updatedProfile = await authService.getProfile();
            localStorage.setItem('inplay_current_user', JSON.stringify(updatedProfile));
            navigate('/');
          } catch (err) {
            console.error('Verification failed:', err);
            alert('Payment verified, but activation failed. Refreshing...');
            window.location.reload();
          }
        }
      });

    } catch (err) {
      console.error('Subscription Error:', err);
      alert(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrial = () => {
    if (plans.length > 0) {
      handleSubscribe(plans[0]._id, true);
    } else {
      alert('No plans available to start trial. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
        <div className="loader">Loading plans...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '20px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Crown size={32} color="#EAB308" style={{ marginBottom: '8px' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 6px' }}>Choose Your Plan</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Unlimited access to all movies & series</p>
        </div>

        {/* Trial Offer - Featured */}
        {trialSettings?.isTrialActive && !currentUser?.subscription?.isTrialUsed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #DFB556 0%, #FDF4B8 30%, #DFB556 70%, #AA771C 100%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '30px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(223, 181, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#5c430e', marginBottom: '4px' }}>
                <Crown size={12} fill="currentColor" /> VIP OFFER
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: '0 0 2px', color: '#111' }}>{trialSettings?.trialDurationDays} Days Trial</h2>
              <p style={{ fontSize: '0.9rem', margin: 0, color: 'rgba(17, 17, 17, 0.8)', fontWeight: '600' }}>Get full access for just ₹{trialSettings?.trialPrice}</p>
            </div>

            <button
              onClick={handleTrial}
              style={{
                position: 'relative',
                zIndex: 1,
                background: '#111',
                color: '#FDF4B8',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}
            >
              Claim <ArrowRight size={16} />
            </button>

            <div style={{ position: 'absolute', right: '10%', top: '50%', transform: 'translateY(-50%)', opacity: 0.3, pointerEvents: 'none', color: '#FFF' }}>
              <Crown size={100} />
            </div>
          </motion.div>
        ) : null}
        {/* Featured Promotional Video */}
        {(trialSettings?.promoVideoUrl || trialSettings?.promoVideoHlsUrl) ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'relative',
              width: 'calc(100% + 40px)',
              marginLeft: '-20px',
              marginRight: '-20px',
              borderRadius: '20px',
              overflow: 'hidden',
              marginBottom: '40px',
              border: '1px solid #333',
              background: '#111',
              minHeight: '280px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
          >
            <video
              src={trialSettings?.promoVideoHlsUrl || getImageUrl(trialSettings?.promoVideoUrl)}
              autoPlay
              loop
              playsInline
              preload="auto"
              poster={getImageUrl(trialSettings?.promoVideoThumbnail)}
              onCanPlay={(e) => e.target.play().catch(() => { })}
              style={{ width: '100%', height: '100%', minHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
          </motion.div>
        ) : null}

        {/* Plans Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '60px',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {plans.map((plan, index) => {
            const gradients = [
              'linear-gradient(135deg, #A8E063 0%, #56AB2F 100%)', // Green
              'linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)', // Red
              'linear-gradient(135deg, #B28DFF 0%, #8A4FFF 100%)', // Purple
              'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)'  // Blue
            ];
            const gradient = gradients[index % gradients.length];

            return (
              <motion.button
                key={plan._id}
                onClick={() => handleSubscribe(plan._id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: '#111',
                  borderRadius: '16px',
                  padding: '20px 12px',
                  border: '1px solid #333',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '1 1 0',
                  minWidth: '90px',
                  maxWidth: '120px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{
                  background: gradient,
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  ₹{plan.price}
                </div>
                <span style={{ color: '#E5E7EB', fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' }}>
                  {plan.duration || plan.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div style={{
          background: '#0F172A',
          borderRadius: '24px',
          padding: '30px 20px',
          boxShadow: 'inset 0 0 100px rgba(70, 211, 105, 0.05)',
          width: 'calc(100% + 40px)',
          marginLeft: '-20px',
          marginRight: '-20px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '24px', textAlign: 'center' }}>Wait... Why InPlay?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', flexShrink: 0, background: 'rgba(70, 211, 105, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="#46d369" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Safe & Secure</h4>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>End-to-end encrypted payments via Razorpay</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', flexShrink: 0, background: 'rgba(70, 211, 105, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} color="#46d369" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Premium Quality</h4>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>4K Ultra HD and immersive surround sound</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
              <div style={{ width: '48px', height: '48px', flexShrink: 0, background: 'rgba(70, 211, 105, 0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={24} color="#46d369" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Cancel Anytime</h4>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>No long term commitment. Stop when you want.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '0.85rem' }}>
          <p>Recurring billing. Cancel anytime. Offer valid for new customers only.</p>
          <p>© 2026 InPlay OTT Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default PlanPage;
