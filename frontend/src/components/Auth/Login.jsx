import React, { useState } from 'react';
import { Milk, Lock, User, Eye, EyeOff, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, loading } = useAuth();

  // Forgot password flow
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: request code, 2: enter code & new pass
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!identifier.trim() || !password) {
      setLocalError('Please enter your email or phone number and password');
      return;
    }

    const res = await login(identifier.trim(), password);
    if (!res.success) {
      setLocalError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');
    if (!forgotIdentifier.trim()) {
      setForgotError('Please provide your phone or email');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await authService.forgotPassword(forgotIdentifier.trim());
      if (data.success) {
        setForgotMsg(`Reset code generated: ${data.resetCode || 'Check phone/email'}`);
        if (data.resetCode) setResetCode(data.resetCode);
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to generate reset code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    if (!resetCode || !newPassword) {
      setForgotError('Please enter the reset code and your new password');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await authService.resetPasswordWithCode(forgotIdentifier.trim(), resetCode, newPassword);
      if (data.success) {
        setForgotMsg('Password reset successfully! You can now log in.');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep(1);
          setPassword(newPassword);
          setIdentifier(forgotIdentifier);
        }, 1500);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        backgroundImage: 'radial-gradient(circle at 50% 20%, #1E293B 0%, #0F172A 70%)',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem 2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #E6CA65 0%, #D4AF37 100%)',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            <Milk size={32} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', margin: '0 0 0.25rem 0' }}>
            BALAJI DAIRY
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Enterprise Dairy Management & Operations ERP
          </p>
        </div>

        {/* Error Alert */}
        {localError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger-text)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{localError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <span>Email or Phone Number</span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>ईमेल / फ़ोन नंबर</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="e.g. 7906564964 or owner@balaji.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Password</span>
                <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>पासवर्ड</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(identifier);
                  setShowForgotModal(true);
                }}
                style={{ background: 'none', border: 'none', color: '#B38F24', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Forgot?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-lg"
            style={{ width: '100%', marginTop: '1rem', fontWeight: 800 }}
            disabled={loading}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In to Balaji Dairy'
            )}
          </button>
        </form>

        {/* Quick Fill Credentials Banner */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
            border: '1px dashed rgba(212, 175, 55, 0.4)',
            fontSize: '0.775rem',
            color: '#475569',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>📞 Phone Login (Backend)</div>
              <div>ID: <code style={{ color: '#B38F24', fontWeight: 600 }}>7906564964</code></div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIdentifier('7906564964');
                setPassword('AdityaOwner123');
              }}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.725rem',
                fontWeight: 700,
                backgroundColor: '#D4AF37',
                color: '#0F172A',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Fill Phone
            </button>
          </div>

          <div style={{ borderTop: '1px dashed rgba(212, 175, 55, 0.25)', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>⚡ Supabase Auth</div>
              <div>Email: <code style={{ color: '#B38F24', fontWeight: 600 }}>adityakumar7906@gmail.com</code></div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIdentifier('adityakumar7906@gmail.com');
                setPassword('');
              }}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.725rem',
                fontWeight: 700,
                backgroundColor: 'var(--color-primary, #0F172A)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Fill Email
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Balaji Dairy Management System v2.0 • Secure Operations
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="var(--color-accent)" />
                <h3 style={{ margin: 0 }}>Reset Password</h3>
              </div>
            </div>

            <div className="modal-body">
              {forgotError && (
                <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                  {forgotError}
                </div>
              )}
              {forgotMsg && (
                <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)', fontSize: '0.825rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{forgotMsg}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestReset}>
                  <div className="form-group">
                    <label className="form-label">Registered Phone or Email</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 7906564964 or owner@balaji.com"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={forgotLoading}>
                    {forgotLoading ? 'Generating Code...' : 'Get Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit}>
                  <div className="form-group">
                    <label className="form-label">Enter 6-Digit Reset Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 123456"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password (Min 6 chars)</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={forgotLoading}>
                    {forgotLoading ? 'Updating Password...' : 'Save New Password & Login'}
                  </button>
                </form>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowForgotModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
