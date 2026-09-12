import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await authService.getMe();
      if (data.success) setUser(data.user);
      else clearSession();
    } catch (err) {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => clearSession();
    window.addEventListener('balaji:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('balaji:unauthorized', handleUnauthorized);
  }, []);

  const login = async (phone, password) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.login(phone.trim(), password);
      if (!data?.success || !data?.token || !data?.user) {
        return { success: false, message: 'Invalid login response' };
      }
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || (err.code === 'ECONNABORTED' ? 'Server timed out. Please try again.' : 'Login failed');
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => clearSession();

  const changePassword = async (oldPassword, newPassword) => {
    try {
      return await authService.changePassword(oldPassword, newPassword);
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, changePassword, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
