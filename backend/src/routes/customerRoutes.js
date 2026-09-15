const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  getNextCustomerCode,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/next-code', getNextCustomerCode);
router.route('/').get(getCustomers).post(createCustomer);
router
  .route('/:id')
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(authorize('owner', 'manager'), deleteCustomer);

module.exports = router;
