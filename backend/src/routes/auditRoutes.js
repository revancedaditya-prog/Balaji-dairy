const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes
router.use(authorize('owner')); // Owner only

router.get('/', getLogs);

module.exports = router;
