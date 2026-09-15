import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    try {
      setLoading(true);

      // 1. If Supabase is configured, check Supabase session first
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          setUser({
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Owner',
            phone: profile?.phone || session.user.phone || '',
            role: profile?.role || 'owner',
            status: profile?.status || 'active',
          });
          setLoading(false);
          return;
        }
      }

      // 2. Check local JWT token for REST API backend
      const token = localStorage.getItem('token');
      if (token) {
        const data = await authService.getMe();
        if (data.success) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Supabase auth state change listener
    let authListener = null;
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          setUser({
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Owner',
            phone: profile?.phone || session.user.phone || '',
            role: profile?.role || 'owner',
            status: profile?.status || 'active',
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      authListener = subscription;
    }

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const login = async (identifier, password) => {
    try {
      setLoading(true);

      // A. Try Supabase Auth if email format
      if (isSupabaseConfigured && supabase && String(identifier).includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: identifier.trim(),
            password,
          });
          if (!error && data?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            const loggedInUser = {
              id: data.user.id,
              email: data.user.email,
              name: profile?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Owner',
              phone: profile?.phone || data.user.phone || '',
              role: profile?.role || 'owner',
              status: profile?.status || 'active',
            };
            setUser(loggedInUser);
            return { success: true };
          }
        } catch (supErr) {
          console.warn('Supabase login attempted, falling back to REST API:', supErr.message);
        }
      }

      // B. Fallback to Node/Express REST API (Supports Phone / Username / Email)
      const data = await authService.login(identifier, password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return {
          success: false,
          message: data.message || 'Invalid credentials'
        };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  const changePassword = async (oldPassword, newPassword) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true, message: 'Password updated' };
    }
    const data = await authService.changePassword(oldPassword, newPassword);
    return data;
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
