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
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.route('/')
  .post(addSupplier)
  .get(getSuppliers);

router.route('/bulk')
  .post(bulkUploadSuppliers);

router.route('/code/:code')
  .get(getSupplierByCode);

router.route('/:id')
  .get(getSupplierById)
  .put(updateSupplier)
  .delete(deleteSupplier);

module.exports = router;
