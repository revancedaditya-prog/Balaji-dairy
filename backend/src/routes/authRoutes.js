const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPasswordWithCode,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPasswordWithCode);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
