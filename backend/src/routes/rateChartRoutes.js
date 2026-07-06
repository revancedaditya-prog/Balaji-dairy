const express = require('express');
const router = express.Router();
const {
  setRate,
  bulkUpload,
  lookupRate,
  getRateChart,
  clearRateChart,
} = require('../controllers/rateChartController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(authorize('owner'), setRate)
  .get(authorize('owner'), getRateChart)
  .delete(authorize('owner'), clearRateChart);

router.route('/bulk')
  .post(authorize('owner'), bulkUpload);

router.route('/lookup')
  .get(lookupRate);

module.exports = router;
