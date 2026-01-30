import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import authService from './services/api/authService';

export default function Login({ onClose, onSwitchToSignup, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authService.login(formData.email, formData.password);
      onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
              Sign in to continue watching
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '10px'
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888'
                }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
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

            {/* Password Field */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '10px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#888'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '16px 48px 16px 48px',
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
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

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
              {isLoading ? 'Signing In...' : 'Sign In'}
            </motion.button>

            {/* Switch to Signup */}
            <div style={{ textAlign: 'center' }}>
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
