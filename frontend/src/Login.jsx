import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from './services/api/authService';
import { trackLogin } from './utils/analytics';
export default function Login({ onClose, onSwitchToSignup, onLoginSuccess }) {
  const [step, setStep] = useState(1); // 1 = Phone input, 2 = OTP input
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Populated when socketService.handleForceLogout() redirects with ?reason=...
  const kickedReason = searchParams.get('reason');
  
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handlePhoneChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (numericValue.length <= 10) setPhone(numericValue);
    setError('');
  };

  const handleOtpChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    if (numericValue.length <= 6) setOtp(numericValue);
    setError('');
  };

  const requestOtp = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await authService.requestOtp(phone);
      setSuccess('OTP sent successfully!');
      setStep(2);
      setResendTimer(15);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to request OTP. Please try again or create an account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      await authService.requestOtp(phone);
      setSuccess('OTP resent successfully!');
      setResendTimer(15);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.verifyOtp(phone, otp);
      trackLogin('phone');
      onLoginSuccess();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="auth-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: 'white',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              Welcome Back
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.95rem', fontWeight: '500' }}>
              {step === 1 ? 'Sign in with your phone number' : 'Enter the OTP to verify'}
            </p>
          </div>

          {/* Device-Kick Warning Banner — shown when redirected with ?reason= from another device login */}
          {kickedReason && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#eab308',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              textAlign: 'center',
              fontWeight: '500',
              lineHeight: '1.4'
            }}>
              ⚠️ {decodeURIComponent(kickedReason)}
            </div>
          )}

          {/* Form */}
          <form onSubmit={step === 1 ? requestOtp : verifyOtp}>
            {step === 1 ? (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter your mobile number"
                    required
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      background: '#242424',
                      border: '1px solid #333',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ff0a16';
                      e.target.style.background = '#2a2a2a';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#333';
                      e.target.style.background = '#242424';
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#fff', fontSize: '0.9rem', fontWeight: '600', marginBottom: '10px' }}>
                  One Time Password (OTP)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="Enter 6-digit OTP"
                    required
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 48px',
                      background: '#242424',
                      border: '1px solid #333',
                      borderRadius: '16px',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      letterSpacing: '2px',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ff0a16';
                      e.target.style.background = '#2a2a2a';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#333';
                      e.target.style.background = '#242424';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#ef4444',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.2)',
                color: '#22c55e',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {success}
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: '#ff0a16',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '18px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.3s ease',
                marginBottom: '24px',
                boxShadow: '0 8px 24px rgba(255, 10, 22, 0.3)'
              }}
            >
              {isLoading ? 'Please wait...' : (step === 1 ? 'Request OTP' : 'Verify & Login')}
            </motion.button>

             {/* Navigation options */}
            <div style={{ textAlign: 'center' }}>
              {step === 2 && (
                <>
                  <button
                    type="button"
                    disabled={resendTimer > 0 || isLoading}
                    onClick={handleResendOtp}
                    style={{
                      color: resendTimer > 0 ? '#6b7280' : '#ff0a16',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                      marginBottom: '16px',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      color: '#9ca3af',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      marginBottom: '16px',
                      display: 'block',
                      width: '100%'
                    }}
                  >
                    Change Phone Number
                  </button>
                </>
              )}
              <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  style={{
                    color: '#ff0a16',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '0 4px'
                  }}
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
