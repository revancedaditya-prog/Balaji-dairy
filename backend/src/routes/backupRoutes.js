const express = require('express');
const router = express.Router();
const { exportBackup, restoreBackup } = require('../controllers/backupController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Guard all routes

router.get('/export', exportBackup);
router.post('/restore', restoreBackup);

module.exports = router;
