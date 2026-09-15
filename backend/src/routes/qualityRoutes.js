const express = require('express');
const router = express.Router();
const {
  getQualityTests,
  addQualityTest,
  deleteQualityTest,
} = require('../controllers/qualityController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getQualityTests).post(addQualityTest);
router.route('/:id').delete(authorize('owner', 'manager'), deleteQualityTest);

module.exports = router;
