const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Guard all user routes to owners only
router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.put('/:id/reset-password', resetUserPassword);

module.exports = router;
