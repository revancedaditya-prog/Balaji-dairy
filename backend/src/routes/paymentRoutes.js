const express = require('express');
const router = express.Router();
const {
  recordPayment,
  getPayments,
  getLedger,
  getSupplierLedger,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(recordPayment)
  .get(getPayments);

router.get('/ledger', getLedger);
router.get('/ledger/:code', getSupplierLedger);

module.exports = router;
