const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.get('/', getLogs);

module.exports = router;
