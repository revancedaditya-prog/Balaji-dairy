import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

// Request interceptor to add JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle unauthorized errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (phone, password) => {
    const res = await API.post('/auth/login', { phone, password });
    return res.data;
  },
  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data;
  },
  changePassword: async (oldPassword, newPassword) => {
    const res = await API.put('/auth/change-password', { oldPassword, newPassword });
    return res.data;
  },
};

export const supplierService = {
  getSuppliers: async (filters = {}) => {
    const res = await API.get('/suppliers', { params: filters });
    return res.data;
  },
  getSupplierById: async (id) => {
    const res = await API.get(`/suppliers/${id}`);
    return res.data;
  },
  getSupplierByCode: async (code) => {
    const res = await API.get(`/suppliers/code/${code}`);
    return res.data;
  },
  addSupplier: async (data) => {
    const res = await API.post('/suppliers', data);
    return res.data;
  },
  updateSupplier: async (id, data) => {
    const res = await API.put(`/suppliers/${id}`, data);
    return res.data;
  },
  deleteSupplier: async (id) => {
    const res = await API.delete(`/suppliers/${id}`);
    return res.data;
  },
  bulkUpload: async (suppliers) => {
    const res = await API.post('/suppliers/bulk', { suppliers });
    return res.data;
  },
};

export const milkEntryService = {
  getEntries: async (filters = {}) => {
    const res = await API.get('/milk-entries', { params: filters });
    return res.data;
  },
  getEntryById: async (id) => {
    const res = await API.get(`/milk-entries/${id}`);
    return res.data;
  },
  addEntry: async (data) => {
    const res = await API.post('/milk-entries', data);
    return res.data;
  },
  updateEntry: async (id, data) => {
    const res = await API.put(`/milk-entries/${id}`, data);
    return res.data;
  },
  deleteEntry: async (id) => {
    const res = await API.delete(`/milk-entries/${id}`);
    return res.data;
  },
};

export const rateChartService = {
  getRateChart: async () => {
    const res = await API.get('/rate-chart');
    return res.data;
  },
  setRate: async (data) => {
    const res = await API.post('/rate-chart', data);
    return res.data;
  },
  bulkUpload: async (rates) => {
    const res = await API.post('/rate-chart/bulk', { rates });
    return res.data;
  },
  lookupRate: async (fat, snf) => {
    const res = await API.get('/rate-chart/lookup', { params: { fat, snf } });
    return res.data;
  },
  clearRateChart: async () => {
    const res = await API.delete('/rate-chart');
    return res.data;
  },
};

export const reportService = {
  getDashboardStats: async () => {
    const res = await API.get('/reports/dashboard-stats');
    return res.data;
  },
  getChartsData: async () => {
    const res = await API.get('/reports/charts');
    return res.data;
  },
  getShiftWise: async (filters = {}) => {
    const res = await API.get('/reports/shift-wise', { params: filters });
    return res.data;
  },
  getSupplierWise: async (filters = {}) => {
    const res = await API.get('/reports/supplier-wise', { params: filters });
    return res.data;
  },
  getVillageWise: async (filters = {}) => {
    const res = await API.get('/reports/village-wise', { params: filters });
    return res.data;
  },
  getMonthly: async (filters = {}) => {
    const res = await API.get('/reports/monthly', { params: filters });
    return res.data;
  },
  getYearly: async (filters = {}) => {
    const res = await API.get('/reports/yearly', { params: filters });
    return res.data;
  },
};

export const paymentService = {
  getPayments: async (filters = {}) => {
    const res = await API.get('/payments', { params: filters });
    return res.data;
  },
  recordPayment: async (data) => {
    const res = await API.post('/payments', data);
    return res.data;
  },
  getLedger: async (filters = {}) => {
    const res = await API.get('/payments/ledger', { params: filters });
    return res.data;
  },
  getSupplierLedger: async (code) => {
    const res = await API.get(`/payments/ledger/${code}`);
    return res.data;
  },
};

export const auditService = {
  getLogs: async (filters = {}) => {
    const res = await API.get('/audit-logs', { params: filters });
    return res.data;
  },
};

export const backupService = {
  exportUrl: () => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    return `${baseUrl}/backup/export?token=${token}`;
  },
  triggerExport: async () => {
    const res = await API.get('/backup/export', { responseType: 'blob' });
    return res.data;
  },
  restore: async (data) => {
    const res = await API.post('/backup/restore', data);
    return res.data;
  },
};

export default API;
