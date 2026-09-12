require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { getJwtSecret } = require('./config/auth');

const authRoutes = require('./routes/authRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const milkEntryRoutes = require('./routes/milkEntryRoutes');
const rateChartRoutes = require('./routes/rateChartRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const backupRoutes = require('./routes/backupRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Fail fast on unsafe/missing production authentication configuration.
getJwtSecret();
connectDB();

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Native apps/curl may not send Origin. Development remains permissive unless configured.
    if (!origin || process.env.NODE_ENV !== 'production' || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`[API Request] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Balaji Dairy Management API server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/milk-entries', milkEntryRoutes);
app.use('/api/rate-chart', rateChartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
