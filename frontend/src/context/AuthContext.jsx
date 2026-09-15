import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
  };

  const checkAuth = async () => {
    if (!supabase.getSession()?.access_token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await authService.getMe();
      if (data.success && data.user?.status === 'active') setUser(data.user);
      else await clearSession();
    } catch {
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const login = async (phone, password) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.login(phone.trim(), password);
      if (!data?.success || !data?.user) return { success: false, message: 'Invalid login response' };
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.message || 'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => { await clearSession(); };

  const changePassword = async (oldPassword, newPassword) => {
    try { return await authService.changePassword(oldPassword, newPassword); }
    catch (err) { throw new Error(err.message || 'Failed to update password'); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, changePassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
