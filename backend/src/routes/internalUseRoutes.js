const express = require('express');
const router = express.Router();
const {
  getInternalUse,
  addInternalUse,
  updateInternalUse,
  deleteInternalUse,
} = require('../controllers/internalUseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getInternalUse).post(addInternalUse);
router
  .route('/:id')
  .put(updateInternalUse)
  .delete(authorize('owner', 'manager'), deleteInternalUse);

module.exports = router;
