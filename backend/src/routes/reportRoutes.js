const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getChartsData,
  getShiftWiseReport,
  getSupplierWiseReport,
  getVillageWiseReport,
  getMonthlyReport,
  getYearlyReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.get('/dashboard-stats', getDashboardStats);
router.get('/charts', getChartsData);

router.get('/shift-wise', authorize('owner', 'manager'), getShiftWiseReport);
router.get('/supplier-wise', authorize('owner', 'manager'), getSupplierWiseReport);
router.get('/village-wise', authorize('owner', 'manager'), getVillageWiseReport);
router.get('/monthly', authorize('owner', 'manager'), getMonthlyReport);
router.get('/yearly', authorize('owner', 'manager'), getYearlyReport);

module.exports = router;
