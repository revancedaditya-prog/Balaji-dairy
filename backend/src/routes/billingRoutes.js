const express = require('express');
const router = express.Router();
const {
  previewBill,
  saveBill,
  getBills,
} = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/preview', previewBill);
router.route('/').get(getBills).post(saveBill);

module.exports = router;
