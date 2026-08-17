import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { KeyRound, ShieldAlert, ArrowLeft, Info } from 'lucide-react';

export default function VerifyOTP() {
  const { verifyOTP, sendOTP } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      addToast('No email address provided. Redirecting...', 'error');
      navigate('/register');
    }
  }, [location, navigate, addToast]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyOTP(email, otp);
      if (res.success) {
        addToast('Verification successful! You can now log in.', 'success');
        navigate('/login');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
      addToast(err.message || 'OTP verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setResending(true);
    setError('');

    try {
      const res = await sendOTP(email);
      if (res.success) {
        setDevMode(res.devMode);
        addToast('A new 6-digit code has been sent!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to resend code.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 73px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative'
    }}>
      <div className="glass-panel animate-scale" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            marginBottom: '16px'
          }}>
            <KeyRound size={32} />
          </div>
          <h2 style={{ fontSize: '26px', color: 'var(--text-main)', marginBottom: '8px' }}>
            Verify Your Email
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            We sent a verification code to <strong style={{ color: 'var(--text-main)' }}>{email}</strong>.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-glow)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {devMode && (
          <div style={{
            backgroundColor: 'var(--warning-glow)',
            color: 'var(--warning)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            lineHeight: '1.4',
            marginBottom: '20px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Dev Mode Active:</strong> No SMTP credentials set. Check the <strong>backend console log</strong> for the 6-digit verification code.
            </span>
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              6-Digit Verification Code
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{
                textAlign: 'center',
                letterSpacing: '8px',
                fontSize: '22px',
                fontWeight: 'bold',
                padding: '12px'
              }}
              maxLength={6}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email & Activate'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ArrowLeft size={16} /> Register page
            </button>
            
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              {resending ? 'Resending...' : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
