const express = require('express');
const router = express.Router();
const {
  recordPayment,
  getPayments,
  getLedger,
  getSupplierLedger,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(authorize('owner'), recordPayment)
  .get(authorize('owner', 'manager'), getPayments);

router.get('/ledger', authorize('owner', 'manager'), getLedger);
router.get('/ledger/:code', authorize('owner', 'manager'), getSupplierLedger);

module.exports = router;
