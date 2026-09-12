import React, { useEffect, useState } from 'react';
import { Milk, Mail, LockKeyhole, UserRound, Database, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login, loading } = useAuth();

  useEffect(() => {
    if (supabase.auth.consumeRecoverySessionFromUrl()) {
      setResetMode(true);
      setResetStep('password');
      setSuccess('Recovery link verified. Create your new password.');
    }
  }, []);

  const clearMessages = () => {
    setLocalError('');
    setSuccess('');
  };

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) return setLocalError('Please fill in email ID and password');
    if (!validEmail(email)) return setLocalError('Please enter a valid email ID');

    if (setupMode) {
      if (!name.trim()) return setLocalError('Please enter owner name');
      try {
        setSetupLoading(true);
        const res = await supabase.function('bootstrap-owner', { name: name.trim(), email: email.trim().toLowerCase(), password });
        if (!res?.success) throw new Error(res?.message || 'Owner setup failed');
        setSuccess('Owner account created. You can now login with email.');
        setSetupMode(false);
      } catch (err) {
        setLocalError(err.message || 'Owner setup failed');
      } finally {
        setSetupLoading(false);
      }
      return;
    }

    // authService currently keeps the first login argument for compatibility;
    // it is now treated as an email by the Supabase auth helper.
    const res = await login(email, password);
    if (!res.success) setLocalError(res.message || 'Login failed. Please check credentials.');
  };

  const startReset = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!validEmail(email)) return setLocalError('Enter your registered email ID');
    try {
      setResetLoading(true);
      await supabase.auth.sendPasswordResetEmail(email.trim());
      setSuccess('Password reset link sent to your registered email ID. Open the link from your email.');
    } catch (err) {
      setLocalError(err.message || 'Could not send password reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const finishReset = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword.length < 6) return setLocalError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setLocalError('Passwords do not match');
    try {
      setResetLoading(true);
      await supabase.auth.updatePassword(newPassword);
      await supabase.auth.signOut();
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetMode(false);
      setResetStep('email');
      setSuccess('Password changed successfully. Login with your email and new password.');
    } catch (err) {
      setLocalError(err.message || 'Could not update password');
    } finally {
      setResetLoading(false);
    }
  };

  const busy = loading || setupLoading || resetLoading;

  if (resetMode) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="brand-logo"><KeyRound size={30} strokeWidth={2.2} /></div>
            <h1>Reset Password</h1>
            <p>Use your registered email ID to receive a secure reset link</p>
          </div>

          {localError && <div className="error-alert" style={{marginBottom:'12px'}}>{localError}</div>}
          {success && <div className="success-alert" style={{marginBottom:'12px'}}>{success}</div>}

          {resetStep === 'email' && (
            <form onSubmit={startReset} className="login-form">
              <div className="form-group">
                <label className="form-label">Registered Email ID</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input type="email" className="form-control" placeholder="name@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
          )}

          {resetStep === 'password' && (
            <form onSubmit={finishReset} className="login-form">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-with-icon"><LockKeyhole size={18} className="input-icon" /><input type="password" className="form-control" placeholder="Minimum 6 characters" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} minLength="6" required /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="input-with-icon"><LockKeyhole size={18} className="input-icon" /><input type="password" className="form-control" placeholder="Re-enter new password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} minLength="6" required /></div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Updating...' : 'Set New Password'}</button>
            </form>
          )}

          <button type="button" onClick={()=>{setResetMode(false);setResetStep('email');clearMessages();}} style={{width:'100%',marginTop:'14px',border:'none',background:'transparent',color:'#60707b',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>← Back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-logo"><Milk size={30} strokeWidth={2.2} /></div>
          <h1>Balaji Dairy</h1>
          <p>{setupMode ? 'Create the first owner account for the new Supabase system' : 'Milk collection, farmer ledger & billing management'}</p>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',borderRadius:'12px',background:'#f7f2ea',color:'#5d6872',fontSize:'12px',fontWeight:600,marginBottom:'14px'}}>
          <Database size={16} />
          <span>Connected to Balaji Dairy Supabase</span>
        </div>

        {localError && <div className="error-alert" style={{marginBottom:'12px'}}>{localError}</div>}
        {success && <div className="success-alert" style={{marginBottom:'12px'}}>{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {setupMode && (
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <div className="input-with-icon">
                <UserRound size={18} className="input-icon" />
                <input type="text" className="form-control" placeholder="Enter owner name" value={name} onChange={(e)=>setName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email ID</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input type="email" className="form-control" placeholder="name@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} className="input-icon" />
              <input type="password" className="form-control" placeholder={setupMode ? 'Create password (minimum 6 characters)' : 'Enter password'} value={password} onChange={(e)=>setPassword(e.target.value)} minLength="6" autoComplete="current-password" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Please wait...' : setupMode ? 'Create Owner Account' : 'Login'}
          </button>
        </form>

        {!setupMode && (
          <button type="button" onClick={()=>{setResetMode(true);clearMessages();}} style={{width:'100%',marginTop:'12px',border:'none',background:'transparent',color:'#9a741f',fontSize:'12px',fontWeight:800,cursor:'pointer'}}>Forgot password? Reset by email</button>
        )}

        <button type="button" onClick={()=>{setSetupMode(!setupMode);clearMessages();}} style={{width:'100%',marginTop:'10px',border:'none',background:'transparent',color:'#60707b',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
          {setupMode ? '← Back to login' : 'First time on Supabase? Set up owner'}
        </button>
      </div>
    </div>
  );
};

export default Login;
