import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    _id: 'mock-owner-id',
    name: 'Balaji Owner',
    phone: '9876543210',
    role: 'owner',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    // Auto-bypass: keep loading false and user set
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (phone, password) => {
    return { success: true };
  };

  const logout = () => {
    // Auto-bypass: disable logout
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const data = await authService.changePassword(oldPassword, newPassword);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        changePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
