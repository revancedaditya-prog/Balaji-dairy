import React, { useState } from 'react';
import { Milk, Phone, LockKeyhole, UserRound, Database, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetStep, setResetStep] = useState('phone');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login, loading } = useAuth();

  const clearMessages = () => {
    setLocalError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!phone || !password) return setLocalError('Please fill in phone number and password');

    if (setupMode) {
      if (!name.trim()) return setLocalError('Please enter owner name');
      try {
        setSetupLoading(true);
        const res = await supabase.function('bootstrap-owner', { name: name.trim(), phone: phone.trim(), password });
        if (!res?.success) throw new Error(res?.message || 'Owner setup failed');
        setSuccess('Owner account created. You can now login.');
        setSetupMode(false);
      } catch (err) {
        setLocalError(err.message || 'Owner setup failed');
      } finally {
        setSetupLoading(false);
      }
      return;
    }

    const res = await login(phone, password);
    if (!res.success) setLocalError(res.message || 'Login failed. Please check credentials.');
  };

  const startReset = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!phone.trim()) return setLocalError('Enter your registered mobile number');
    try {
      setResetLoading(true);
      await supabase.auth.sendPasswordResetOtp(phone.trim());
      setResetStep('otp');
      setSuccess('OTP sent to your registered mobile number.');
    } catch (err) {
      const message = err.message || 'Could not send OTP';
      if (/provider|sms|phone/i.test(message)) {
        setLocalError('SMS/Phone provider is not configured in Supabase yet. Enable a Phone provider to use OTP password reset.');
      } else {
        setLocalError(message);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!otp.trim()) return setLocalError('Enter the OTP');
    try {
      setResetLoading(true);
      await supabase.auth.verifyPasswordResetOtp({ phone: phone.trim(), token: otp.trim() });
      setResetStep('password');
      setSuccess('OTP verified. Create your new password.');
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired OTP');
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
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setResetMode(false);
      setResetStep('phone');
      setSuccess('Password changed successfully. Login with your new password.');
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
            <p>Verify your registered mobile number with OTP</p>
          </div>

          {localError && <div className="error-alert" style={{marginBottom:'12px'}}>{localError}</div>}
          {success && <div className="success-alert" style={{marginBottom:'12px'}}>{success}</div>}

          {resetStep === 'phone' && (
            <form onSubmit={startReset} className="login-form">
              <div className="form-group">
                <label className="form-label">Registered Mobile Number</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input type="tel" inputMode="numeric" className="form-control" placeholder="10-digit mobile number" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Sending OTP...' : 'Send OTP'}</button>
            </form>
          )}

          {resetStep === 'otp' && (
            <form onSubmit={verifyOtp} className="login-form">
              <div className="form-group">
                <label className="form-label">OTP</label>
                <input type="text" inputMode="numeric" className="form-control" placeholder="Enter OTP" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Verifying...' : 'Verify OTP'}</button>
              <button type="button" className="btn btn-block" style={{marginTop:'8px'}} onClick={startReset} disabled={busy}>Resend OTP</button>
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

          <button type="button" onClick={()=>{setResetMode(false);setResetStep('phone');clearMessages();}} style={{width:'100%',marginTop:'14px',border:'none',background:'transparent',color:'#60707b',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>← Back to login</button>
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
            <label className="form-label">Phone Number</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input type="tel" inputMode="numeric" className="form-control" placeholder="10-digit mobile number" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <LockKeyhole size={18} className="input-icon" />
              <input type="password" className="form-control" placeholder={setupMode ? 'Create password (minimum 6 characters)' : 'Enter password'} value={password} onChange={(e)=>setPassword(e.target.value)} minLength="6" required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Please wait...' : setupMode ? 'Create Owner Account' : 'Login'}
          </button>
        </form>

        {!setupMode && (
          <button type="button" onClick={()=>{setResetMode(true);clearMessages();}} style={{width:'100%',marginTop:'12px',border:'none',background:'transparent',color:'#9a741f',fontSize:'12px',fontWeight:800,cursor:'pointer'}}>Forgot password? Reset with OTP</button>
        )}

        <button type="button" onClick={()=>{setSetupMode(!setupMode);clearMessages();}} style={{width:'100%',marginTop:'10px',border:'none',background:'transparent',color:'#60707b',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
          {setupMode ? '← Back to login' : 'First time on Supabase? Set up owner'}
        </button>
      </div>
    </div>
  );
};

export default Login;
