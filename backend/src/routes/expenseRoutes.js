const express = require('express');
const router = express.Router();
const {
  getExpenses,
  getExpenseStats,
  addExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getExpenseStats);
router.route('/').get(getExpenses).post(addExpense);
router
  .route('/:id')
  .put(updateExpense)
  .delete(authorize('owner', 'manager'), deleteExpense);

module.exports = router;
