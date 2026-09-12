const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wrjbffoigmazailmfkvu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LyhbH9NkPwJUvyAc_9qZUg_XefIrN3N';

const STORAGE_KEY = 'balaji_supabase_session';

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

const setSession = (session) => {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
};

const authHeaders = (extra = {}) => {
  const token = getSession()?.access_token;
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

const request = async (path, options = {}) => {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = text || null; }

  if (!response.ok) {
    const error = new Error(
      data?.msg || data?.message || data?.error_description || data?.hint ||
      (typeof data === 'string' ? data : `Request failed (${response.status})`)
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

const query = async (table, params = '', options = {}) => {
  const suffix = params ? `?${params}` : '';
  return request(`/rest/v1/${table}${suffix}`, options);
};

const consumeRecoverySessionFromUrl = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hash.get('type') !== 'recovery' || !hash.get('access_token')) return false;
  setSession({
    access_token: hash.get('access_token'),
    refresh_token: hash.get('refresh_token'),
    token_type: hash.get('token_type') || 'bearer',
    expires_in: Number(hash.get('expires_in') || 3600),
  });
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return true;
};

export const supabaseLite = {
  url: SUPABASE_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
  getSession,
  setSession,
  auth: {
    async signInWithPassword({ email, password }) {
      const data = await request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: String(email || '').trim().toLowerCase(), password }),
      });
      setSession(data);
      return data;
    },
    async sendPasswordResetEmail(email) {
      return request('/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({
          email: String(email || '').trim().toLowerCase(),
          redirect_to: `${window.location.origin}${window.location.pathname}`,
        }),
      });
    },
    consumeRecoverySessionFromUrl,
    async updatePassword(password) {
      return request('/auth/v1/user', {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
    },
    async getUser() {
      const session = getSession();
      if (!session?.access_token) return null;
      try {
        return await request('/auth/v1/user');
      } catch (error) {
        if (error.status === 401) setSession(null);
        throw error;
      }
    },
    async signOut() {
      try {
        if (getSession()?.access_token) await request('/auth/v1/logout', { method: 'POST' });
      } finally {
        setSession(null);
      }
    },
  },
  query,
  rpc(name, args = {}) {
    return request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });
  },
  function(name, body = {}) {
    return request(`/functions/v1/${name}`, { method: 'POST', body: JSON.stringify(body) });
  },
};

export default supabaseLite;
