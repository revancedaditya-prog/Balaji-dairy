import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // App.jsx is state-driven rather than route-driven. Tell AuthContext to clear
      // the current user instead of navigating the WebView/browser to /login.
      window.dispatchEvent(new CustomEvent('balaji:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (phone, password) => (await API.post('/auth/login', { phone, password })).data,
  getMe: async () => (await API.get('/auth/me')).data,
  changePassword: async (oldPassword, newPassword) => (await API.put('/auth/change-password', { oldPassword, newPassword })).data,
};

export const supplierService = {
  getSuppliers: async (filters = {}) => (await API.get('/suppliers', { params: filters })).data,
  getSupplierById: async (id) => (await API.get(`/suppliers/${id}`)).data,
  getSupplierByCode: async (code) => (await API.get(`/suppliers/code/${code}`)).data,
  addSupplier: async (data) => (await API.post('/suppliers', data)).data,
  updateSupplier: async (id, data) => (await API.put(`/suppliers/${id}`, data)).data,
  deleteSupplier: async (id) => (await API.delete(`/suppliers/${id}`)).data,
  bulkUpload: async (suppliers) => (await API.post('/suppliers/bulk', { suppliers })).data,
};

export const milkEntryService = {
  getEntries: async (filters = {}) => (await API.get('/milk-entries', { params: filters })).data,
  getEntryById: async (id) => (await API.get(`/milk-entries/${id}`)).data,
  addEntry: async (data) => (await API.post('/milk-entries', data)).data,
  updateEntry: async (id, data) => (await API.put(`/milk-entries/${id}`, data)).data,
  deleteEntry: async (id) => (await API.delete(`/milk-entries/${id}`)).data,
};

export const rateChartService = {
  getRateChart: async () => (await API.get('/rate-chart')).data,
  setRate: async (data) => (await API.post('/rate-chart', data)).data,
  bulkUpload: async (rates) => (await API.post('/rate-chart/bulk', { rates })).data,
  lookupRate: async (fat, snf) => (await API.get('/rate-chart/lookup', { params: { fat, snf } })).data,
  clearRateChart: async () => (await API.delete('/rate-chart')).data,
  deleteRate: async (id) => (await API.delete(`/rate-chart/${id}`)).data,
};

export const reportService = {
  getDashboardStats: async () => (await API.get('/reports/dashboard-stats')).data,
  getChartsData: async () => (await API.get('/reports/charts')).data,
  getShiftWise: async (filters = {}) => (await API.get('/reports/shift-wise', { params: filters })).data,
  getSupplierWise: async (filters = {}) => (await API.get('/reports/supplier-wise', { params: filters })).data,
  getVillageWise: async (filters = {}) => (await API.get('/reports/village-wise', { params: filters })).data,
  getMonthly: async (filters = {}) => (await API.get('/reports/monthly', { params: filters })).data,
  getYearly: async (filters = {}) => (await API.get('/reports/yearly', { params: filters })).data,
};

export const paymentService = {
  getPayments: async (filters = {}) => (await API.get('/payments', { params: filters })).data,
  recordPayment: async (data) => (await API.post('/payments', data)).data,
  getLedger: async (filters = {}) => (await API.get('/payments/ledger', { params: filters })).data,
  getSupplierLedger: async (code) => (await API.get(`/payments/ledger/${code}`)).data,
};

export const auditService = {
  getLogs: async (filters = {}) => (await API.get('/audit-logs', { params: filters })).data,
};

export const userService = {
  getUsers: async () => (await API.get('/users')).data,
  getUserById: async (id) => (await API.get(`/users/${id}`)).data,
  createUser: async (data) => (await API.post('/users', data)).data,
  updateUser: async (id, data) => (await API.put(`/users/${id}`, data)).data,
  deleteUser: async (id) => (await API.delete(`/users/${id}`)).data,
  resetPassword: async (id, password) => (await API.put(`/users/${id}/reset-password`, { password })).data,
};

export const backupService = {
  triggerExport: async () => (await API.get('/backup/export', { responseType: 'blob' })).data,
  restore: async (data) => (await API.post('/backup/restore', data)).data,
};

export default API;
