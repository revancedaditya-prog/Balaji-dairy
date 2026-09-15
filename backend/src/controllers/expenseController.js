const Expense = require('../models/Expense');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Get expenses with filters
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  const { date, startDate, endDate, category, paymentMode } = req.query;

  try {
    let query = {};
    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (category) query.category = category;
    if (paymentMode) query.paymentMode = paymentMode;

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
    const totalAmount = Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

    res.status(200).json({ success: true, count: expenses.length, totalAmount, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expense summary statistics
// @route   GET /api/expenses/stats
// @access  Private
exports.getExpenseStats = async (req, res) => {
  try {
    const today = getISTDate();
    const firstDayOfMonth = today.substring(0, 7) + '-01';

    // Today's total
    const todayAgg = await Expense.aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Monthly total
    const monthAgg = await Expense.aggregate([
      { $match: { date: { $gte: firstDayOfMonth, $lte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Category breakdown this month
    const categoryAgg = await Expense.aggregate([
      { $match: { date: { $gte: firstDayOfMonth, $lte: today } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        todayExpenses: todayAgg[0] ? Math.round(todayAgg[0].total * 100) / 100 : 0,
        monthlyExpenses: monthAgg[0] ? Math.round(monthAgg[0].total * 100) / 100 : 0,
        categoryBreakdown: categoryAgg.map(c => ({ category: c._id, amount: Math.round(c.total * 100) / 100, count: c.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Private
exports.addExpense = async (req, res) => {
  const { date, category, amount, paymentMode, description, billReference } = req.body;

  try {
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required' });
    }

    const expense = await Expense.create({
      date: date || getISTDate(),
      category,
      amount: Number(amount),
      paymentMode: paymentMode || 'Cash',
      description: description || '',
      billReference: billReference || '',
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'EXPENSE_ADD',
      `Expense logged: ₹${amount} for ${category}`
    );

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Owner/Manager only)
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
