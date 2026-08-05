import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowRight, Star, ChevronDown, ChevronUp, Volume2, VolumeX, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import authService from './services/api/authService';
import subscriptionService from './services/api/subscriptionService';
import { initRazorpayPayment } from './lib/utils/razorpay';
import HlsPlayer from './components/HlsPlayer';
import { getImageUrl } from './utils/imageUtils';
import { trackSubscriptionView, trackSubscriptionInitiated, trackSubscriptionPurchase, trackSubscriptionRenewed, trackTrialInitiated, trackTrialPurchase, trackTrialRenewed } from './utils/analytics';
import { isUserSubscribed } from './utils/subscription';

const PlanPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedPlans, setExpandedPlans] = useState({});
  const [isMuted, setIsMuted] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const togglePlanDetails = (planId) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  useEffect(() => {
    fetchData();
    trackSubscriptionView();
  }, []);

  useEffect(() => {
    if (currentUser && isUserSubscribed(currentUser)) {
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

      const activePlans = allPlans.filter(p => p.isActive);
      setPlans(activePlans);
      if (activePlans.length > 0) {
        setSelectedPlanId(activePlans[0]._id);
      }
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
        orderId: subData.orderId,
        amount: subData.isOrder ? subData.amount * 100 : undefined,
        description: subData.description || (isTrial ? 'Pay Trial & Enable AutoPay' : `${subData.planName} Plan`),
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
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              isLifetime: subData.isLifetime
            });

            const isRenewal = Boolean(
              currentUser?.subscription?.plan ||
              currentUser?.subscription?.endDate ||
              currentUser?.subscription?.razorpay_subscription_id ||
              currentUser?.subscription?.isTrialUsed ||
              currentUser?.subscription?.trialEndedAt
            );

            if (isTrial) {
              if (isRenewal) {
                trackTrialRenewed({ planId, price: subData.amount });
              } else {
                trackTrialPurchase({ planId, price: subData.amount });
              }
            } else {
              if (isRenewal) {
                trackSubscriptionRenewed({ planId, price: subData.amount });
              } else {
                trackSubscriptionPurchase({ planId, price: subData.amount });
              }
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      background: 'radial-gradient(circle at 50% top, #1a0505 0%, #000 50%)', 
      color: '#fff', 
      padding: '20px 0', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(234,179,8,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translate(-50%, 0)', width: '400px', height: '200px', background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <img src="/FINAL_LOGO_copy__1_.jpg-removebg-preview (2).png" alt="INPLAY" style={{ height: '100px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.2))' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #555)', width: '15px' }}></div>
              <span style={{ fontSize: '0.85rem', color: '#9CA3AF', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.8, fontWeight: '800' }}>OTT</span>
              <div style={{ height: '1px', background: 'linear-gradient(to left, transparent, #555)', width: '15px' }}></div>
            </div>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 6px', letterSpacing: '0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>PREMIUM ENTERTAINMENT</h1>
          <p style={{ color: '#EAB308', fontSize: '0.8rem', fontWeight: '800', margin: 0, textShadow: '0 2px 8px rgba(234,179,8,0.3)' }}>UNLIMITED ACCESS. ONE TIME PAYMENT.</p>
        </div>

        {/* Trial Offer - Featured */}
        {trialSettings?.isTrialActive && !currentUser?.subscription?.isTrialUsed ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, #DFB556 0%, #FDF4B8 30%, #DFB556 70%, #AA771C 100%)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#5c430e' }}>VIP OFFER</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, color: '#111' }}>{trialSettings?.trialDurationDays} Days Trial</h2>
            </div>
            <button
              onClick={handleTrial}
              style={{ background: '#111', color: '#FDF4B8', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
            >
              ₹{trialSettings?.trialPrice} - Claim
            </button>
          </motion.div>
        ) : null}

        {/* Plans Area */}
        <div style={{ marginBottom: '24px' }}>
          {plans.length > 0 && (
            <motion.div
              onClick={() => setSelectedPlanId(plans[0]._id)}
              style={{
                background: 'linear-gradient(180deg, #181818 0%, #050505 100%)',
                border: selectedPlanId === plans[0]._id ? '2px solid #EAB308' : '1px solid #735914',
                borderRadius: '16px',
                padding: '24px 16px 16px',
                marginBottom: '24px',
                position: 'relative',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: selectedPlanId === plans[0]._id ? 'inset 0 0 20px rgba(234, 179, 8, 0.15), 0 0 20px rgba(234, 179, 8, 0.4)' : '0 10px 30px rgba(0,0,0,0.8)',
                maxWidth: '360px',
                margin: '0 auto 24px'
              }}
            >
              {/* Ribbon Banner */}
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '10px', height: '14px', background: '#936a00', clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }}></div>
                <div style={{ background: 'linear-gradient(to right, #FDF4B8, #DFB556)', color: '#000', padding: '4px 16px', fontWeight: '900', fontSize: '0.7rem', letterSpacing: '0.5px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                  ONE TIME PAYMENT
                </div>
                <div style={{ width: '10px', height: '14px', background: '#936a00', clipPath: 'polygon(0 0, 0 100%, 100% 0)' }}></div>
              </div>

              {/* Best Value Badge */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'radial-gradient(ellipse at top left, #FDF4B8 0%, #DFB556 50%, #905c12 100%)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900', fontSize: '0.65rem', border: '1px dashed #4a3000', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', zIndex: 2 }}>
                <span style={{ fontSize: '0.45rem', marginBottom: '2px', color: '#222' }}>★★★</span>
                BEST<br/>VALUE
                <span style={{ fontSize: '0.45rem', marginTop: '2px', color: '#222' }}>★★★</span>
              </div>
              
              <div style={{ filter: 'drop-shadow(0px 4px 10px rgba(234,179,8,0.25))' }}>
                <h2 style={{ fontSize: '4rem', fontWeight: '900', margin: '16px 0 8px', background: 'linear-gradient(to bottom, #FFE896 0%, #D89C33 45%, #925C13 55%, #F4D068 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', lineHeight: 1 }}>
                  <span style={{ fontSize: '2rem', marginTop: '8px', marginRight: '4px' }}>₹</span>{plans[0].price}
                </h2>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#FFF', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {plans[0].name}
              </h3>
            </motion.div>
          )}

          {plans.length > 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }}></div>
                <span style={{ background: '#000', padding: '0 12px', position: 'relative', zIndex: 1, fontSize: '0.85rem', fontWeight: '800', color: '#FFF', letterSpacing: '0.5px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>FLEXIBLE PLANS</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', maxWidth: '440px', margin: '0 auto' }}>
                {plans.slice(1).map(plan => (
                  <motion.div
                    key={plan._id}
                    onClick={() => setSelectedPlanId(plan._id)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #181818 0%, #080808 100%)',
                      border: selectedPlanId === plan._id ? '1px solid #ef4444' : '1px solid #333',
                      borderRadius: '12px',
                      padding: '16px',
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: selectedPlanId === plan._id ? 'inset 0 0 15px rgba(239, 68, 68, 0.1), 0 0 15px rgba(239, 68, 68, 0.3)' : '0 6px 15px rgba(0,0,0,0.6)'
                    }}
                  >
                    <div style={{ background: 'linear-gradient(to right, #ef4444, #991b1b)', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', display: 'inline-block', marginBottom: '12px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                      {plan.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#FFF', marginTop: '2px', marginRight: '4px' }}>₹</span>
                      <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#FFF', lineHeight: 1, textShadow: '0 2px 8px rgba(255,255,255,0.2)' }}>{plan.price}</span>
                    </div>
                    <div style={{ color: '#EAB308', fontWeight: '800', fontSize: '0.75rem', marginTop: '8px' }}>
                      {plan.duration === 'quarterly' ? '3 Months Access' : plan.duration === 'half-yearly' ? '6 Months Access' : plan.duration === 'yearly' ? '12 Months Access' : plan.duration === 'monthly' ? '1 Month Access' : plan.duration}
                    </div>
                    <p style={{ color: '#9CA3AF', fontSize: '0.65rem', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {plan.description}
                    </p>
                    <div style={{ position: 'absolute', right: '4px', bottom: '8px', opacity: selectedPlanId === plan._id ? 0.2 : 0.05, transition: 'all 0.3s' }}>
                      <Play size={50} color="#ef4444" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Features Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
          {[
            { icon: <Play size={12} color="#EAB308" />, text: "EXCLUSIVE SHOWS" },
            { icon: <VolumeX size={12} color="#EAB308" />, text: "AD-FREE VIEWING" },
            { icon: <Check size={12} color="#EAB308" />, text: "ANY DEVICE" },
            { icon: <Shield size={12} color="#EAB308" />, text: "SAFE & SECURE" },
          ].map((feature, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', width: '22%' }}>
              <div style={{ width: '28px', height: '28px', border: '1px solid rgba(234, 179, 8, 0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(234, 179, 8, 0.05)', boxShadow: '0 0 10px rgba(234,179,8,0.1)' }}>
                {feature.icon}
              </div>
              <span style={{ fontSize: '0.55rem', fontWeight: '800', color: '#D1D5DB', lineHeight: 1.2 }}>
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        {/* Unified Subscribe Button */}
        <div style={{ textAlign: 'center', marginBottom: '16px', maxWidth: '360px', margin: '0 auto' }}>
          <button
            onClick={() => handleSubscribe(selectedPlanId)}
            disabled={!selectedPlanId || loading}
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, #ff4d4d 0%, #cc0000 50%, #990000 100%)',
              color: '#FFF',
              border: 'none',
              borderRadius: '30px',
              padding: '14px 0',
              fontSize: '1.2rem',
              fontWeight: '900',
              cursor: selectedPlanId ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 25px rgba(220, 38, 38, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
              opacity: selectedPlanId ? 1 : 0.6,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {loading ? 'PROCESSING...' : 'SUBSCRIBE NOW'} <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
             <Shield size={12} color="#EAB308" /> <span style={{ fontWeight: '600' }}>Secure Payment | Instant Access</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6, letterSpacing: '0.5px', fontWeight: '700' }}>
             WORKS ON <Check size={12} /> MOBILE <Check size={12} /> TABLET <Check size={12} /> LAPTOP <Check size={12} /> TV
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanPage;
