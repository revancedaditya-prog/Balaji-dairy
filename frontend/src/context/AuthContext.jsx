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

      // 2. Check local JWT token / saved local owner session
      const token = localStorage.getItem('token');
      const savedUserStr = localStorage.getItem('balaji_user');
      if (token && savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.role) {
            setUser(parsed);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      if (token) {
        try {
          const data = await authService.getMe();
          if (data.success) {
            setUser(data.user);
            localStorage.setItem('balaji_user', JSON.stringify(data.user));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('balaji_user');
            setUser(null);
          }
        } catch (meErr) {
          console.warn('Backend getMe check failed:', meErr.message);
          if (savedUserStr) {
            setUser(JSON.parse(savedUserStr));
          }
        }
      } else {
        // Auto-login as default Owner (Aditya Kumar)
        if (localStorage.getItem('balaji_explicit_logged_out') !== 'true') {
          const defaultOwner = {
            _id: '6a4b82654a04bf4ce114d96f',
            id: '12b5dc3a-8b79-445c-b09c-efb685dfd777',
            name: 'Aditya Kumar',
            phone: '7906564964',
            email: 'adityakumar7906@gmail.com',
            role: 'owner',
            status: 'active',
          };
          localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.balaji_dairy_owner_session');
          localStorage.setItem('balaji_user', JSON.stringify(defaultOwner));
          setUser(defaultOwner);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      const defaultOwner = {
        _id: '6a4b82654a04bf4ce114d96f',
        id: '12b5dc3a-8b79-445c-b09c-efb685dfd777',
        name: 'Aditya Kumar',
        phone: '7906564964',
        email: 'adityakumar7906@gmail.com',
        role: 'owner',
        status: 'active',
      };
      setUser(defaultOwner);
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

          const authedUser = {
            id: session.user.id,
            email: session.user.email,
            name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Owner',
            phone: profile?.phone || session.user.phone || '',
            role: profile?.role || 'owner',
            status: profile?.status || 'active',
          };
          setUser(authedUser);
          localStorage.setItem('balaji_user', JSON.stringify(authedUser));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('balaji_user');
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
      localStorage.removeItem('balaji_explicit_logged_out');

      const cleanId = String(identifier || '').trim();
      const cleanPass = String(password || '').trim();

      // Quick Owner Bypass for Default Credentials (Aditya Kumar)
      if (
        (cleanId === '7906564964' || cleanId.toLowerCase() === 'adityakumar7906@gmail.com') &&
        cleanPass === 'AdityaOwner123'
      ) {
        const ownerUser = {
          _id: '6a4b82654a04bf4ce114d96f',
          id: '12b5dc3a-8b79-445c-b09c-efb685dfd777',
          name: 'Aditya Kumar',
          phone: '7906564964',
          email: 'adityakumar7906@gmail.com',
          role: 'owner',
          status: 'active',
        };
        localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.balaji_dairy_owner_session');
        localStorage.setItem('balaji_user', JSON.stringify(ownerUser));
        setUser(ownerUser);
        return { success: true };
      }

      // A. Try Supabase Auth if email format
      let supabaseErrorMsg = null;
      if (isSupabaseConfigured && supabase && cleanId.includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanId,
            password: cleanPass,
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
            localStorage.setItem('balaji_user', JSON.stringify(loggedInUser));
            setUser(loggedInUser);
            return { success: true };
          } else if (error) {
            supabaseErrorMsg = error.message;
          }
        } catch (supErr) {
          supabaseErrorMsg = supErr.message;
          console.warn('Supabase login attempted, falling back to REST API:', supErr.message);
        }
      }

      // B. Fallback to Node/Express REST API (Supports Phone / Username / Email)
      try {
        const data = await authService.login(cleanId, cleanPass);
        if (data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('balaji_user', JSON.stringify(data.user));
          setUser(data.user);
          return { success: true };
        } else {
          return {
            success: false,
            message: supabaseErrorMsg || data.message || 'Invalid credentials'
          };
        }
      } catch (apiErr) {
        return {
          success: false,
          message: supabaseErrorMsg || apiErr.response?.data?.message || 'Login failed. Please check credentials or network.'
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
    localStorage.removeItem('balaji_user');
    localStorage.setItem('balaji_explicit_logged_out', 'true');
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
