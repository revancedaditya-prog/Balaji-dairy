const express = require('express');
const router = express.Router();
const {
  recordPayment,
  getPayments,
  getLedgerList,
  getCustomerLedger,
} = require('../controllers/customerPaymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/ledger', getLedgerList);
router.get('/ledger/:code', getCustomerLedger);
router.route('/').get(getPayments).post(recordPayment);

module.exports = router;
