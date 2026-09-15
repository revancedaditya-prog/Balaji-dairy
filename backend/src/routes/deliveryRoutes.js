const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDailyRouteSheet,
  bulkRecordDeliveries,
  recordDelivery,
  updateDelivery,
  deleteDelivery,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/route-sheet', getDailyRouteSheet);
router.post('/bulk', bulkRecordDeliveries);
router.route('/').get(getDeliveries).post(recordDelivery);
router
  .route('/:id')
  .put(updateDelivery)
  .delete(authorize('owner', 'manager'), deleteDelivery);

module.exports = router;
