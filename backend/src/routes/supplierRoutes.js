const express = require('express');
const router = express.Router();
const {
  addSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierByCode,
  updateSupplier,
  deleteSupplier,
  bulkUploadSuppliers,
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(authorize('owner', 'manager'), addSupplier)
  .get(getSuppliers);

router.route('/bulk')
  .post(authorize('owner', 'manager'), bulkUploadSuppliers);

router.route('/code/:code')
  .get(getSupplierByCode);

router.route('/:id')
  .get(getSupplierById)
  .put(authorize('owner', 'manager'), updateSupplier)
  .delete(authorize('owner', 'manager'), deleteSupplier);

module.exports = router;
