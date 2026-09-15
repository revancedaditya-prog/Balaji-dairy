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
  getProfitAnalytics,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/charts', getChartsData);
router.get('/shift-wise', getShiftWiseReport);
router.get('/supplier-wise', getSupplierWiseReport);
router.get('/village-wise', getVillageWiseReport);
router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/profit-analytics', authorize('owner'), getProfitAnalytics);

module.exports = router;
