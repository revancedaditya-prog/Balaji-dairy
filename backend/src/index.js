require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { getCorsOptions, validateEnvironment } = require('./config/env');
const { getErrorStatus } = require('./utils/http');

// Route imports
const authRoutes = require('./routes/authRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const milkEntryRoutes = require('./routes/milkEntryRoutes');
const rateChartRoutes = require('./routes/rateChartRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const auditRoutes = require('./routes/auditRoutes');
const backupRoutes = require('./routes/backupRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize app
const app = express();

if (process.env.NODE_ENV === 'production') {
  // Render/Vercel forward the original client IP through one trusted proxy hop.
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors(getCorsOptions()));
app.use(helmet());
app.use('/api/backup/restore', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));
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
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/users', userRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error('[API Error]', {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  let status = getErrorStatus(err);
  if (err.type === 'entity.parse.failed') status = 400;

  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = process.env.PORT || 5001;
const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
