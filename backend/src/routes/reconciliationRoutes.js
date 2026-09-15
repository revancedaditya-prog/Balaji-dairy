const express = require('express');
const router = express.Router();
const {
  getDailyReconciliation,
  saveReconciliation,
  getReconciliationHistory,
} = require('../controllers/reconciliationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/daily', getDailyReconciliation);
router.get('/history', getReconciliationHistory);
router.post('/', saveReconciliation);

module.exports = router;
