import React, { useState } from 'react';
import { Milk, Phone, LockKeyhole, UserRound, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../lib/supabase';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
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

  const busy = loading || setupLoading;

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

        <button type="button" onClick={()=>{setSetupMode(!setupMode);setLocalError('');setSuccess('');}} style={{width:'100%',marginTop:'14px',border:'none',background:'transparent',color:'#60707b',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
          {setupMode ? '← Back to login' : 'First time on Supabase? Set up owner'}
        </button>
      </div>
    </div>
  );
};

export default Login;
