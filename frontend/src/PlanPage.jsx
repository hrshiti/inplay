import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import authService from './services/api/authService';
import subscriptionService from './services/api/subscriptionService';
import { initRazorpayPayment } from './lib/utils/razorpay';
import HlsPlayer from './components/HlsPlayer';
import { getImageUrl } from './utils/imageUtils';

const PlanPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.phone === '6268204871' || currentUser.phone === '6268455485')) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allPlans, appSettings, profile] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getAppSettings(),
        authService.getProfile()
      ]);
      setPlans(allPlans.filter(p => p.isActive));
      setTrialSettings(appSettings?.subscriptionSettings);
      setCurrentUser(profile);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId, isTrial = false) => {
    try {
      setLoading(true);

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
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Crown size={48} color="#EAB308" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 8px' }}>Choose Your Plan</h1>
          <p style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>Unlimited access to all movies, series, and exclusives</p>
        </div>

        {/* Trial Offer - Featured */}
        {trialSettings?.isTrialActive && !currentUser?.subscription?.isTrialUsed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #46d369 0%, #2e8b44 100%)',
              borderRadius: '24px',
              padding: '30px',
              marginBottom: '40px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(70, 211, 105, 0.3)'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '700', marginBottom: '12px' }}>
                  <Zap size={14} /> NEW USER OFFER
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 4px' }}>{trialSettings?.trialDurationDays} Days Trial</h2>
                <p style={{ fontSize: '1.1rem', margin: 0, opacity: 0.9 }}>Get full access for just ₹{trialSettings?.trialPrice}</p>
              </div>
              <button
                onClick={handleTrial}
                style={{
                  background: '#fff',
                  color: '#2e8b44',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Claim Now <ArrowRight size={20} />
              </button>
            </div>
            <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, pointerEvents: 'none' }}>
              <Zap size={200} />
            </div>
          </motion.div>
        ) : null}
        {/* Featured Promotional Video */}
        {(trialSettings?.promoVideoUrl || trialSettings?.promoVideoHlsUrl) ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
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
              ref={(el) => { if (el) el.playbackRate = 1.5; }}
              src={trialSettings?.promoVideoHlsUrl || getImageUrl(trialSettings?.promoVideoUrl)}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={getImageUrl(trialSettings?.promoVideoThumbnail)}
              onCanPlay={(e) => e.target.play().catch(() => {})}
              style={{ width: '100%', height: '100%', minHeight: '280px', objectFit: 'cover', display: 'block' }}
            />
          </motion.div>
        ) : null}

        {/* Plans Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '60px' }}>
          {plans.map((plan, index) => (
            <motion.div
              key={plan._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: '#111',
                borderRadius: '24px',
                padding: '40px',
                border: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 8px' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '900' }}>₹{plan.price}</span>
                  <span style={{ color: '#9CA3AF' }}>/{plan.duration}</span>
                </div>
              </div>

              <div style={{ color: '#D1D5DB', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '30px', flex: 1 }}>
                {plan.description}
              </div>

              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Check size={18} color="#46d369" /> <span>Original Series & Movies</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Check size={18} color="#46d369" /> <span>High Quality Streaming</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={18} color="#46d369" /> <span>Ad-free Experience</span>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(plan._id)}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '2px solid #333',
                  padding: '14px',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = '#46d369'; e.target.style.color = '#46d369'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = '#333'; e.target.style.color = '#fff'; }}
              >
                Select {plan.name}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Benefits Section */}
        <div style={{
          background: '#0F172A',
          borderRadius: '32px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: 'inset 0 0 100px rgba(70, 211, 105, 0.05)'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '40px' }}>Wait... Why InPlay?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>
            <div>
              <div style={{ width: '60px', height: '60px', background: 'rgba(70, 211, 105, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Shield size={30} color="#46d369" />
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Safe & Secure</h4>
              <p style={{ color: '#9CA3AF', fontSize: '0.9rem', margin: 0 }}>End-to-end encrypted payments via Razorpay</p>
            </div>
            <div>
              <div style={{ width: '60px', height: '60px', background: 'rgba(70, 211, 105, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Star size={30} color="#46d369" />
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Premium Quality</h4>
              <p style={{ color: '#9CA3AF', fontSize: '0.9rem', margin: 0 }}>4K Ultra HD and immersive surround sound</p>
            </div>
            <div>
              <div style={{ width: '60px', height: '60px', background: 'rgba(70, 211, 105, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Crown size={30} color="#46d369" />
              </div>
              <h4 style={{ margin: '0 0 8px' }}>Cancel Anytime</h4>
              <p style={{ color: '#9CA3AF', fontSize: '0.9rem', margin: 0 }}>No long term commitment. Stop when you want.</p>
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
