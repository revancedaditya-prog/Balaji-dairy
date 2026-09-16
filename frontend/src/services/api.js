import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://balaji-dairy-management.onrender.com/api',
  timeout: 15000,
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
      // Let AuthContext handle view change smoothly
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (identifier, password) => {
    const res = await API.post('/auth/login', { phone: identifier, email: identifier, username: identifier, password });
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
  forgotPassword: async (identifier) => {
    const res = await API.post('/auth/forgot-password', { identifier });
    return res.data;
  },
  resetPasswordWithCode: async (identifier, resetCode, newPassword) => {
    const res = await API.put('/auth/reset-password', { identifier, resetCode, newPassword });
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
  deleteRate: async (id) => {
    const res = await API.delete(`/rate-chart/${id}`);
    return res.data;
  },
};

export const customerService = {
  getCustomers: async (filters = {}) => {
    const res = await API.get('/customers', { params: filters });
    return res.data;
  },
  getCustomerById: async (id) => {
    const res = await API.get(`/customers/${id}`);
    return res.data;
  },
  getNextCode: async () => {
    const res = await API.get('/customers/next-code');
    return res.data;
  },
  createCustomer: async (data) => {
    const res = await API.post('/customers', data);
    return res.data;
  },
  updateCustomer: async (id, data) => {
    const res = await API.put(`/customers/${id}`, data);
    return res.data;
  },
  deleteCustomer: async (id) => {
    const res = await API.delete(`/customers/${id}`);
    return res.data;
  },
};

export const deliveryService = {
  getDeliveries: async (filters = {}) => {
    const res = await API.get('/deliveries', { params: filters });
    return res.data;
  },
  getDailyRouteSheet: async (params = {}) => {
    const res = await API.get('/deliveries/route-sheet', { params });
    return res.data;
  },
  bulkRecordDeliveries: async (data) => {
    const res = await API.post('/deliveries/bulk', data);
    return res.data;
  },
  recordDelivery: async (data) => {
    const res = await API.post('/deliveries', data);
    return res.data;
  },
  updateDelivery: async (id, data) => {
    const res = await API.put(`/deliveries/${id}`, data);
    return res.data;
  },
  deleteDelivery: async (id) => {
    const res = await API.delete(`/deliveries/${id}`);
    return res.data;
  },
};

export const customerPaymentService = {
  recordPayment: async (data) => {
    const res = await API.post('/customer-payments', data);
    return res.data;
  },
  getPayments: async (filters = {}) => {
    const res = await API.get('/customer-payments', { params: filters });
    return res.data;
  },
  getLedgerList: async (filters = {}) => {
    const res = await API.get('/customer-payments/ledger', { params: filters });
    return res.data;
  },
  getCustomerLedger: async (code) => {
    const res = await API.get(`/customer-payments/ledger/${code}`);
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

export const billingService = {
  previewBill: async (data) => {
    const res = await API.post('/billing/preview', data);
    return res.data;
  },
  saveBill: async (data) => {
    const res = await API.post('/billing', data);
    return res.data;
  },
  getBills: async (filters = {}) => {
    const res = await API.get('/billing', { params: filters });
    return res.data;
  },
};

export const internalUseService = {
  getInternalUse: async (filters = {}) => {
    const res = await API.get('/internal-use', { params: filters });
    return res.data;
  },
  addInternalUse: async (data) => {
    const res = await API.post('/internal-use', data);
    return res.data;
  },
  updateInternalUse: async (id, data) => {
    const res = await API.put(`/internal-use/${id}`, data);
    return res.data;
  },
  deleteInternalUse: async (id) => {
    const res = await API.delete(`/internal-use/${id}`);
    return res.data;
  },
};

export const expenseService = {
  getExpenses: async (filters = {}) => {
    const res = await API.get('/expenses', { params: filters });
    return res.data;
  },
  getExpenseStats: async () => {
    const res = await API.get('/expenses/stats');
    return res.data;
  },
  addExpense: async (data) => {
    const res = await API.post('/expenses', data);
    return res.data;
  },
  updateExpense: async (id, data) => {
    const res = await API.put(`/expenses/${id}`, data);
    return res.data;
  },
  deleteExpense: async (id) => {
    const res = await API.delete(`/expenses/${id}`);
    return res.data;
  },
};

export const reconciliationService = {
  getDailyReconciliation: async (params = {}) => {
    const res = await API.get('/reconciliation/daily', { params });
    return res.data;
  },
  saveReconciliation: async (data) => {
    const res = await API.post('/reconciliation', data);
    return res.data;
  },
  getReconciliationHistory: async (params = {}) => {
    const res = await API.get('/reconciliation/history', { params });
    return res.data;
  },
};

export const qualityService = {
  getQualityTests: async (filters = {}) => {
    const res = await API.get('/quality-tests', { params: filters });
    return res.data;
  },
  addQualityTest: async (data) => {
    const res = await API.post('/quality-tests', data);
    return res.data;
  },
  deleteQualityTest: async (id) => {
    const res = await API.delete(`/quality-tests/${id}`);
    return res.data;
  },
};

export const reportService = {
  getDashboardStats: async () => {
    const res = await API.get('/reports/dashboard-stats');
    return res.data;
  },
  getProfitAnalytics: async (filters = {}) => {
    const res = await API.get('/reports/profit-analytics', { params: filters });
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

export const searchService = {
  globalSearch: async (q) => {
    const res = await API.get('/search', { params: { q } });
    return res.data;
  },
};

export const settingService = {
  getSettings: async () => {
    const res = await API.get('/settings');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await API.put('/settings', data);
    return res.data;
  },
};

export const auditService = {
  getLogs: async (filters = {}) => {
    const res = await API.get('/audit-logs', { params: filters });
    return res.data;
  },
};

export const userService = {
  getUsers: async () => {
    const res = await API.get('/users');
    return res.data;
  },
  getUserById: async (id) => {
    const res = await API.get(`/users/${id}`);
    return res.data;
  },
  createUser: async (data) => {
    const res = await API.post('/users', data);
    return res.data;
  },
  updateUser: async (id, data) => {
    const res = await API.put(`/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await API.delete(`/users/${id}`);
    return res.data;
  },
  resetPassword: async (id, password) => {
    const res = await API.put(`/users/${id}/reset-password`, { password });
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
