import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle } from 'lucide-react';
import adminAuthService from '../../../services/api/adminAuthService';

export default function DailyCodeModal({ isOpen, onSuccess, onLogout }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-digit daily access code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await adminAuthService.verifyDailyCode(code.trim());
      
      // Update local storage daily verification status
      const savedUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
      savedUser.dailyVerification = {
        ...savedUser.dailyVerification,
        lastVerifiedDate: new Date().toISOString().split('T')[0]
      };
      savedUser.isDailyVerified = true;
      localStorage.setItem('adminUser', JSON.stringify(savedUser));

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Invalid code. Please get today\'s code from Super Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '420px',
        padding: '32px 24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <KeyRound size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111827', margin: '0 0 8px' }}>
          Daily Access Verification
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 20px', lineHeight: '1.5' }}>
          Staff access permissions expire daily at midnight. Please enter today's <strong>6-digit access code</strong> provided by Super Admin to unlock your tabs.
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit Code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1.5rem',
                fontWeight: '700',
                letterSpacing: '8px',
                textAlign: 'center',
                border: '2px solid #d1d5db',
                borderRadius: '10px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: code.length === 6 ? '#2563eb' : '#93c5fd',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}
          >
            {loading ? 'Verifying...' : <><Lock size={18} /> Unlock Daily Access</>}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: '0.85rem',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Logout of Account
        </button>
      </div>
    </div>
  );
}
