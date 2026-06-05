const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');

// Helper to construct a standard match stage
const buildMatchStage = (query) => {
  const { startDate, endDate, shift, supplierCode, village } = query;
  let match = {};

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }

  if (shift) {
    match.shift = shift;
  }

  if (supplierCode) {
    match.supplierCode = parseInt(supplierCode, 10);
  }

  return match;
};

// Helper to compute weighted averages and format output
const commonGroupStage = {
  totalMilk: { $sum: '$milkQuantity' },
  totalAmount: { $sum: '$amount' },
  // To compute weighted average: Sum(fat * milkQuantity)
  fatWeightSum: { $sum: { $multiply: ['$fat', '$milkQuantity'] } },
  snfWeightSum: { $sum: { $multiply: ['$snf', '$milkQuantity'] } },
  entryCount: { $sum: 1 },
};

const commonProjectStage = {
  totalMilk: { $round: ['$totalMilk', 2] },
  totalAmount: { $round: ['$totalAmount', 2] },
  avgFat: {
    $cond: [
      { $gt: ['$totalMilk', 0] },
      { $round: [{ $divide: ['$fatWeightSum', '$totalMilk'] }, 2] },
      0,
    ],
  },
  avgSnf: {
    $cond: [
      { $gt: ['$totalMilk', 0] },
      { $round: [{ $divide: ['$snfWeightSum', '$totalMilk'] }, 2] },
      0,
    ],
  },
  entryCount: 1,
};

// @desc    Get dashboard summary counters
// @route   GET /api/reports/dashboard-stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

    // 1. Total active suppliers
    const totalSuppliers = await Supplier.countDocuments({ status: 'active' });

    // 2. Today's collections
    const todayStats = await MilkEntry.aggregate([
      { $match: { date: todayStr } },
      {
        $group: {
          _id: null,
          totalMilk: { $sum: '$milkQuantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const todayMilk = todayStats[0] ? todayStats[0].totalMilk : 0;
    const todayAmount = todayStats[0] ? todayStats[0].totalAmount : 0;

    // 3. Morning/Evening breakdowns for today
    const shiftStats = await MilkEntry.aggregate([
      { $match: { date: todayStr } },
      {
        $group: {
          _id: '$shift',
          totalMilk: { $sum: '$milkQuantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let morningMilk = 0;
    let eveningMilk = 0;

    shiftStats.forEach((s) => {
      if (s._id === 'Morning') morningMilk = s.totalMilk;
      if (s._id === 'Evening') eveningMilk = s.totalMilk;
    });

    // 4. Monthly collection total
    const monthStats = await MilkEntry.aggregate([
      { $match: { date: { $gte: firstDayOfMonth, $lte: todayStr } } },
      {
        $group: {
          _id: null,
          totalMilk: { $sum: '$milkQuantity' },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const monthlyMilk = monthStats[0] ? monthStats[0].totalMilk : 0;

    // 5. Recent Milk entries (last 5)
    const recentEntries = await MilkEntry.find({}).sort({ date: -1, time: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalSuppliers,
        todayMilk: Math.round(todayMilk * 100) / 100,
        todayAmount: Math.round(todayAmount * 100) / 100,
        morningMilk: Math.round(morningMilk * 100) / 100,
        eveningMilk: Math.round(eveningMilk * 100) / 100,
        monthlyMilk: Math.round(monthlyMilk * 100) / 100,
        recentEntries,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Daily / Monthly Collection Trend Charts data
// @route   GET /api/reports/charts
// @access  Private
exports.getChartsData = async (req, res) => {
  try {
    // A. Daily Trend (last 10 days of entries)
    const dailyTrend = await MilkEntry.aggregate([
      {
        $group: {
          _id: '$date',
          milk: { $sum: '$milkQuantity' },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 10 },
      {
        $project: {
          date: '$_id',
          milk: { $round: ['$milk', 2] },
          amount: { $round: ['$amount', 2] },
          _id: 0,
        },
      },
    ]);

    // B. Monthly Trend (months of current year)
    const currentYear = new Date().getFullYear().toString();
    const monthlyTrend = await MilkEntry.aggregate([
      {
        $match: {
          date: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` },
        },
      },
      {
        $group: {
          _id: { $substrCP: ['$date', 0, 7] }, // Returns YYYY-MM
          milk: { $sum: '$milkQuantity' },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          milk: { $round: ['$milk', 2] },
          amount: { $round: ['$amount', 2] },
          _id: 0,
        },
      },
    ]);

    // C. Top 5 suppliers by quantity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const topSuppliers = await MilkEntry.aggregate([
      { $match: { date: { $gte: thirtyDaysAgoStr } } },
      {
        $group: {
          _id: '$supplierCode',
          name: { $first: '$supplierName' },
          milk: { $sum: '$milkQuantity' },
        },
      },
      { $sort: { milk: -1 } },
      { $limit: 5 },
      {
        $project: {
          supplierCode: '$_id',
          name: 1,
          milk: { $round: ['$milk', 2] },
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        dailyTrend,
        monthlyTrend,
        topSuppliers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Daily & Shift Reports
// @route   GET /api/reports/shift-wise
// @access  Private
exports.getShiftWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);

    // If village is specified, filter codes
    if (req.query.village) {
      const sups = await Supplier.find({ village: new RegExp(req.query.village, 'i') }).select('supplierCode');
      const codes = sups.map(s => s.supplierCode);
      match.supplierCode = { $in: codes };
    }

    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { date: '$date', shift: '$shift' },
          ...commonGroupStage,
        },
      },
      {
        $project: {
          date: '$_id.date',
          shift: '$_id.shift',
          ...commonProjectStage,
          _id: 0,
        },
      },
      { $sort: { date: -1, shift: 1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Supplier-wise report
// @route   GET /api/reports/supplier-wise
// @access  Private
exports.getSupplierWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);

    if (req.query.village) {
      const sups = await Supplier.find({ village: new RegExp(req.query.village, 'i') }).select('supplierCode');
      const codes = sups.map(s => s.supplierCode);
      match.supplierCode = { $in: codes };
    }

    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$supplierCode',
          supplierName: { $first: '$supplierName' },
          ...commonGroupStage,
        },
      },
      {
        $project: {
          supplierCode: '$_id',
          supplierName: 1,
          ...commonProjectStage,
          _id: 0,
        },
      },
      { $sort: { totalMilk: -1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Village-wise report
// @route   GET /api/reports/village-wise
// @access  Private
exports.getVillageWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);

    // We need to associate village to the entries
    // Let's use aggregate $lookup to supplier database
    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierCode',
          foreignField: 'supplierCode',
          as: 'supplierInfo',
        },
      },
      { $unwind: '$supplierInfo' },
      {
        // Filter by village if query param is set
        $match: req.query.village
          ? { 'supplierInfo.village': new RegExp(req.query.village, 'i') }
          : {},
      },
      {
        $group: {
          _id: '$supplierInfo.village',
          ...commonGroupStage,
        },
      },
      {
        $project: {
          village: '$_id',
          ...commonProjectStage,
          _id: 0,
        },
      },
      { $sort: { totalMilk: -1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Monthly-wise report
// @route   GET /api/reports/monthly
// @access  Private
exports.getMonthlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);

    if (req.query.village) {
      const sups = await Supplier.find({ village: new RegExp(req.query.village, 'i') }).select('supplierCode');
      const codes = sups.map(s => s.supplierCode);
      match.supplierCode = { $in: codes };
    }

    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substrCP: ['$date', 0, 7] }, // Returns YYYY-MM
          ...commonGroupStage,
        },
      },
      {
        $project: {
          month: '$_id',
          ...commonProjectStage,
          _id: 0,
        },
      },
      { $sort: { month: -1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Yearly-wise report
// @route   GET /api/reports/yearly
// @access  Private
exports.getYearlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);

    if (req.query.village) {
      const sups = await Supplier.find({ village: new RegExp(req.query.village, 'i') }).select('supplierCode');
      const codes = sups.map(s => s.supplierCode);
      match.supplierCode = { $in: codes };
    }

    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substrCP: ['$date', 0, 4] }, // Returns YYYY
          ...commonGroupStage,
        },
      },
      {
        $project: {
          year: '$_id',
          ...commonProjectStage,
          _id: 0,
        },
      },
      { $sort: { year: -1 } },
    ]);

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
