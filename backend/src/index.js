require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const milkEntryRoutes = require('./routes/milkEntryRoutes');
const rateChartRoutes = require('./routes/rateChartRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const customerRoutes = require('./routes/customerRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const customerPaymentRoutes = require('./routes/customerPaymentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const internalUseRoutes = require('./routes/internalUseRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const settingRoutes = require('./routes/settingRoutes');
const searchRoutes = require('./routes/searchRoutes');
const auditRoutes = require('./routes/auditRoutes');
const backupRoutes = require('./routes/backupRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`[API Request] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Welcome message
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Balaji Dairy Management API server' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/milk-entries', milkEntryRoutes);
app.use('/api/rate-chart', rateChartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/customer-payments', customerPaymentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/internal-use', internalUseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/quality-tests', qualityRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/users', userRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server if not running in serverless environment
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
