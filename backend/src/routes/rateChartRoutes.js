const express = require('express');
const router = express.Router();
const {
  setRate,
  bulkUpload,
  lookupRate,
  getRateChart,
  clearRateChart,
} = require('../controllers/rateChartController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(setRate)
  .get(getRateChart)
  .delete(clearRateChart);

router.route('/bulk')
  .post(bulkUpload);

router.route('/lookup')
  .get(lookupRate);

module.exports = router;
