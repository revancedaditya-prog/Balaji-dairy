const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');

const getISTDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const buildMatchStage = (query) => {
  const { startDate, endDate, shift, supplierCode } = query;
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }
  if (shift) match.shift = shift;
  if (supplierCode) {
    const code = Number(supplierCode);
    if (Number.isInteger(code)) match.supplierCode = code;
  }
  return match;
};

const commonGroupStage = {
  totalMilk: { $sum: '$milkQuantity' }, totalAmount: { $sum: '$amount' },
  fatWeightSum: { $sum: { $multiply: ['$fat', '$milkQuantity'] } },
  snfWeightSum: { $sum: { $multiply: ['$snf', '$milkQuantity'] } }, entryCount: { $sum: 1 },
};
const commonProjectStage = {
  totalMilk: { $round: ['$totalMilk', 2] }, totalAmount: { $round: ['$totalAmount', 2] },
  avgFat: { $cond: [{ $gt: ['$totalMilk', 0] }, { $round: [{ $divide: ['$fatWeightSum', '$totalMilk'] }, 2] }, 0] },
  avgSnf: { $cond: [{ $gt: ['$totalMilk', 0] }, { $round: [{ $divide: ['$snfWeightSum', '$totalMilk'] }, 2] }, 0] }, entryCount: 1,
};

const applyVillageFilter = async (match, village) => {
  if (!village) return;
  const suppliers = await Supplier.find({ village: new RegExp(village, 'i') }).select('supplierCode');
  const codes = suppliers.map((s) => s.supplierCode);
  match.supplierCode = match.supplierCode ? { $in: codes.filter((code) => code === match.supplierCode) } : { $in: codes };
};

exports.getDashboardStats = async (req, res) => {
  try {
    const todayStr = getISTDate();
    const firstDayOfMonth = `${todayStr.substring(0, 7)}-01`;
    const [totalSuppliers, todayStats, shiftStats, monthStats, recentEntries] = await Promise.all([
      Supplier.countDocuments({ status: 'active' }),
      MilkEntry.aggregate([{ $match: { date: todayStr } }, { $group: { _id: null, totalMilk: { $sum: '$milkQuantity' }, totalAmount: { $sum: '$amount' } } }]),
      MilkEntry.aggregate([{ $match: { date: todayStr } }, { $group: { _id: '$shift', totalMilk: { $sum: '$milkQuantity' } } }]),
      MilkEntry.aggregate([{ $match: { date: { $gte: firstDayOfMonth, $lte: todayStr } } }, { $group: { _id: null, totalMilk: { $sum: '$milkQuantity' } } }]),
      MilkEntry.find({}).sort({ date: -1, time: -1 }).limit(5),
    ]);
    const round = (v) => Math.round((v || 0) * 100) / 100;
    const shiftMap = new Map(shiftStats.map((s) => [s._id, s.totalMilk]));
    return res.status(200).json({ success: true, data: {
      totalSuppliers, todayMilk: round(todayStats[0]?.totalMilk), todayAmount: round(todayStats[0]?.totalAmount),
      morningMilk: round(shiftMap.get('Morning')), eveningMilk: round(shiftMap.get('Evening')),
      monthlyMilk: round(monthStats[0]?.totalMilk), recentEntries,
    } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load dashboard statistics' });
  }
};

exports.getChartsData = async (req, res) => {
  try {
    const today = getISTDate();
    const currentYear = today.substring(0, 4);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getISTDate(thirtyDaysAgo);

    const [dailyTrend, monthlyTrend, topSuppliers] = await Promise.all([
      MilkEntry.aggregate([
        { $group: { _id: '$date', milk: { $sum: '$milkQuantity' }, amount: { $sum: '$amount' } } },
        { $sort: { _id: -1 } }, { $limit: 10 }, { $sort: { _id: 1 } },
        { $project: { date: '$_id', milk: { $round: ['$milk', 2] }, amount: { $round: ['$amount', 2] }, _id: 0 } },
      ]),
      MilkEntry.aggregate([
        { $match: { date: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` } } },
        { $group: { _id: { $substrCP: ['$date', 0, 7] }, milk: { $sum: '$milkQuantity' }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }, { $project: { month: '$_id', milk: { $round: ['$milk', 2] }, amount: { $round: ['$amount', 2] }, _id: 0 } },
      ]),
      MilkEntry.aggregate([
        { $match: { date: { $gte: thirtyDaysAgoStr } } },
        { $group: { _id: '$supplierCode', name: { $first: '$supplierName' }, milk: { $sum: '$milkQuantity' } } },
        { $sort: { milk: -1 } }, { $limit: 5 }, { $project: { supplierCode: '$_id', name: 1, milk: { $round: ['$milk', 2] }, _id: 0 } },
      ]),
    ]);
    return res.status(200).json({ success: true, data: { dailyTrend, monthlyTrend, topSuppliers } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load chart data' });
  }
};

exports.getShiftWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query); await applyVillageFilter(match, req.query.village);
    const report = await MilkEntry.aggregate([{ $match: match }, { $group: { _id: { date: '$date', shift: '$shift' }, ...commonGroupStage } }, { $project: { date: '$_id.date', shift: '$_id.shift', ...commonProjectStage, _id: 0 } }, { $sort: { date: -1, shift: 1 } }]);
    return res.status(200).json({ success: true, data: report });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to generate shift report' }); }
};

exports.getSupplierWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query); await applyVillageFilter(match, req.query.village);
    const report = await MilkEntry.aggregate([{ $match: match }, { $group: { _id: '$supplierCode', supplierName: { $first: '$supplierName' }, ...commonGroupStage } }, { $project: { supplierCode: '$_id', supplierName: 1, ...commonProjectStage, _id: 0 } }, { $sort: { totalMilk: -1 } }]);
    return res.status(200).json({ success: true, data: report });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to generate supplier report' }); }
};

exports.getVillageWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
    const report = await MilkEntry.aggregate([
      { $match: match }, { $lookup: { from: 'suppliers', localField: 'supplierCode', foreignField: 'supplierCode', as: 'supplierInfo' } }, { $unwind: '$supplierInfo' },
      { $match: req.query.village ? { 'supplierInfo.village': new RegExp(req.query.village, 'i') } : {} },
      { $group: { _id: '$supplierInfo.village', ...commonGroupStage } }, { $project: { village: '$_id', ...commonProjectStage, _id: 0 } }, { $sort: { totalMilk: -1 } },
    ]);
    return res.status(200).json({ success: true, data: report });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to generate village report' }); }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query); await applyVillageFilter(match, req.query.village);
    const report = await MilkEntry.aggregate([{ $match: match }, { $group: { _id: { $substrCP: ['$date', 0, 7] }, ...commonGroupStage } }, { $project: { month: '$_id', ...commonProjectStage, _id: 0 } }, { $sort: { month: -1 } }]);
    return res.status(200).json({ success: true, data: report });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to generate monthly report' }); }
};

exports.getYearlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query); await applyVillageFilter(match, req.query.village);
    const report = await MilkEntry.aggregate([{ $match: match }, { $group: { _id: { $substrCP: ['$date', 0, 4] }, ...commonGroupStage } }, { $project: { year: '$_id', ...commonProjectStage, _id: 0 } }, { $sort: { year: -1 } }]);
    return res.status(200).json({ success: true, data: report });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to generate yearly report' }); }
};
