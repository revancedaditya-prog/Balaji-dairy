const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const CustomerDelivery = require('../models/CustomerDelivery');
const CustomerPayment = require('../models/CustomerPayment');
const Payment = require('../models/Payment');
const InternalMilkUse = require('../models/InternalMilkUse');
const Expense = require('../models/Expense');
const Setting = require('../models/Setting');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Get Comprehensive Dashboard Stats for Balaji Dairy Command Center
// @route   GET /api/reports/dashboard-stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const todayStr = getISTDate();
    const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

    // 1. Milk Procurement Today
    const todayCollections = await MilkEntry.aggregate([
      { $match: { date: todayStr } },
      {
        $group: {
          _id: '$shift',
          totalMilk: { $sum: '$milkQuantity' },
          totalAmount: { $sum: '$amount' },
          fatSum: { $sum: { $multiply: ['$fat', '$milkQuantity'] } },
          snfSum: { $sum: { $multiply: ['$snf', '$milkQuantity'] } },
          count: { $sum: 1 },
        },
      },
    ]);

    let morningCollected = 0;
    let morningPurchaseVal = 0;
    let eveningCollected = 0;
    let eveningPurchaseVal = 0;

    todayCollections.forEach((c) => {
      if (c._id === 'Morning') {
        morningCollected = c.totalMilk;
        morningPurchaseVal = c.totalAmount;
      }
      if (c._id === 'Evening') {
        eveningCollected = c.totalMilk;
        eveningPurchaseVal = c.totalAmount;
      }
    });

    const totalCollectedToday = Math.round((morningCollected + eveningCollected) * 100) / 100;
    const totalPurchaseToday = Math.round((morningPurchaseVal + eveningPurchaseVal) * 100) / 100;
    const avgPurchaseRate = totalCollectedToday > 0 ? Math.round((totalPurchaseToday / totalCollectedToday) * 100) / 100 : 0;

    // 2. Milk Sales Today
    const todayDeliveries = await CustomerDelivery.aggregate([
      { $match: { date: todayStr, status: { $in: ['Delivered', 'Changed Qty'] } } },
      {
        $group: {
          _id: null,
          totalMilk: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalSoldToday = todayDeliveries[0] ? Math.round(todayDeliveries[0].totalMilk * 100) / 100 : 0;
    const totalSalesToday = todayDeliveries[0] ? Math.round(todayDeliveries[0].totalAmount * 100) / 100 : 0;
    const avgSalesRate = totalSoldToday > 0 ? Math.round((totalSalesToday / totalSoldToday) * 100) / 100 : 0;

    // 3. Internal Milk Use & Wastage Today
    const internalToday = await InternalMilkUse.find({ date: todayStr });
    const internalUseToday = Math.round(internalToday.filter(i => i.purpose !== 'Wastage').reduce((sum, i) => sum + i.quantity, 0) * 100) / 100;
    const wastageToday = Math.round(internalToday.filter(i => i.purpose === 'Wastage').reduce((sum, i) => sum + i.quantity, 0) * 100) / 100;

    // 4. Available / Remaining Milk
    const accountedMilk = Math.round((totalSoldToday + internalUseToday + wastageToday) * 100) / 100;
    const availableMilk = Math.round((totalCollectedToday - accountedMilk) * 100) / 100;

    // 5. Estimated Gross Margin Today
    const grossMarginToday = Math.round((totalSalesToday - totalPurchaseToday) * 100) / 100;
    const grossMarginSpread = Math.round((avgSalesRate - avgPurchaseRate) * 100) / 100;

    // 6. Outstanding Receivables from Customers
    const allCustomers = await Customer.find({ status: 'active' });
    const custCodes = allCustomers.map(c => c.customerCode);

    const custDelAgg = await CustomerDelivery.aggregate([
      { $match: { customerCode: { $in: custCodes }, status: { $in: ['Delivered', 'Changed Qty'] } } },
      { $group: { _id: '$customerCode', total: { $sum: '$amount' } } },
    ]);
    const custPayAgg = await CustomerPayment.aggregate([
      { $match: { customerCode: { $in: custCodes } } },
      { $group: { _id: '$customerCode', paid: { $sum: '$amountPaid' }, adj: { $sum: '$discountOrAdjustment' } } },
    ]);

    const custDelMap = {};
    custDelAgg.forEach(d => custDelMap[d._id] = d.total);
    const custPayMap = {};
    custPayAgg.forEach(p => custPayMap[p._id] = p.paid + p.adj);

    let totalCustomerOutstanding = 0;
    const highDueCustomers = [];

    allCustomers.forEach(c => {
      const open = Number(c.openingBalance) || 0;
      const del = custDelMap[c.customerCode] || 0;
      const pay = custPayMap[c.customerCode] || 0;
      const due = Math.round((open + del - pay) * 100) / 100;
      if (due > 0) {
        totalCustomerOutstanding += due;
        if (due >= 2000) {
          highDueCustomers.push({ code: c.customerCode, name: c.customerName, mobile: c.mobile, due });
        }
      }
    });

    totalCustomerOutstanding = Math.round(totalCustomerOutstanding * 100) / 100;
    highDueCustomers.sort((a, b) => b.due - a.due);

    // 7. Outstanding Payables to Suppliers
    const allSuppliers = await Supplier.find({ status: 'active' });
    const supCodes = allSuppliers.map(s => s.supplierCode);

    const supMilkAgg = await MilkEntry.aggregate([
      { $match: { supplierCode: { $in: supCodes } } },
      { $group: { _id: '$supplierCode', total: { $sum: '$amount' } } },
    ]);
    const supPayAgg = await Payment.aggregate([
      { $match: { supplierCode: { $in: supCodes } } },
      { $group: { _id: '$supplierCode', paid: { $sum: '$amountPaid' } } },
    ]);

    const supMilkMap = {};
    supMilkAgg.forEach(m => supMilkMap[m._id] = m.total);
    const supPayMap = {};
    supPayAgg.forEach(p => supPayMap[p._id] = p.paid);

    let totalSupplierPayable = 0;
    const highPayableSuppliers = [];

    allSuppliers.forEach(s => {
      const milk = supMilkMap[s.supplierCode] || 0;
      const paid = supPayMap[s.supplierCode] || 0;
      const payable = Math.round((milk - paid) * 100) / 100;
      if (payable > 0) {
        totalSupplierPayable += payable;
        if (payable >= 5000) {
          highPayableSuppliers.push({ code: s.supplierCode, name: s.supplierName, mobile: s.mobile, payable });
        }
      }
    });

    totalSupplierPayable = Math.round(totalSupplierPayable * 100) / 100;
    highPayableSuppliers.sort((a, b) => b.payable - a.payable);

    // 8. Recent Activities
    const [recentCollections, recentDeliveries, recentCustomerPayments, recentSupplierPayments] = await Promise.all([
      MilkEntry.find({}).sort({ date: -1, time: -1, createdAt: -1 }).limit(4),
      CustomerDelivery.find({}).sort({ date: -1, createdAt: -1 }).limit(4),
      CustomerPayment.find({}).sort({ date: -1, createdAt: -1 }).limit(4),
      Payment.find({}).sort({ date: -1, createdAt: -1 }).limit(4),
    ]);

    // 9. Operational Alerts
    const alerts = [];
    if (highDueCustomers.length > 0) {
      alerts.push({
        type: 'warning',
        title: `${highDueCustomers.length} Customers with high outstanding (> ₹2,000)`,
        message: `Highest due: ${highDueCustomers[0].name} (₹${highDueCustomers[0].due.toLocaleString('en-IN')})`,
      });
    }
    if (highPayableSuppliers.length > 0) {
      alerts.push({
        type: 'info',
        title: `${highPayableSuppliers.length} Farmers with pending settlements (> ₹5,000)`,
        message: `Highest payable: ${highPayableSuppliers[0].name} (₹${highPayableSuppliers[0].payable.toLocaleString('en-IN')})`,
      });
    }
    if (totalCollectedToday > 0 && Math.abs(availableMilk) > 10) {
      alerts.push({
        type: 'danger',
        title: `Milk Variance Alert: ${Math.abs(availableMilk)} L unallocated`,
        message: availableMilk > 0 ? `${availableMilk}L surplus unrecorded` : `${Math.abs(availableMilk)}L deficit between collection and sales`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        date: todayStr,
        totalSuppliers: allSuppliers.length,
        totalCustomers: allCustomers.length,
        kpi: {
          totalCollectedToday,
          morningCollected: Math.round(morningCollected * 100) / 100,
          eveningCollected: Math.round(eveningCollected * 100) / 100,
          totalPurchaseToday,
          avgPurchaseRate,
          totalSoldToday,
          totalSalesToday,
          avgSalesRate,
          availableMilk,
          grossMarginToday,
          grossMarginSpread,
          totalCustomerOutstanding,
          totalSupplierPayable,
        },
        milkFlow: {
          collected: totalCollectedToday,
          customerSale: totalSoldToday,
          production: internalUseToday,
          wastage: wastageToday,
          balance: availableMilk,
        },
        alerts,
        recentCollections,
        recentDeliveries,
        recentCustomerPayments,
        recentSupplierPayments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Profit & Margins Analytics
// @route   GET /api/reports/profit-analytics
// @access  Private
exports.getProfitAnalytics = async (req, res) => {
  const { startDate, endDate, period } = req.query;

  try {
    const todayStr = getISTDate();
    let start = startDate;
    let end = endDate || todayStr;

    if (!start) {
      if (period === 'today') {
        start = todayStr;
      } else if (period === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        start = d.toISOString().split('T')[0];
      } else if (period === 'year') {
        start = `${new Date().getFullYear()}-01-01`;
      } else {
        // default this month
        start = todayStr.substring(0, 7) + '-01';
      }
    }

    // 1. Milk Purchases in period
    const purchaseAgg = await MilkEntry.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalLiters: { $sum: '$milkQuantity' },
          totalCost: { $sum: '$amount' },
        },
      },
    ]);

    const totalPurchaseLiters = purchaseAgg[0] ? Math.round(purchaseAgg[0].totalLiters * 100) / 100 : 0;
    const totalPurchaseCost = purchaseAgg[0] ? Math.round(purchaseAgg[0].totalCost * 100) / 100 : 0;
    const avgPurchasePerLiter = totalPurchaseLiters > 0 ? Math.round((totalPurchaseCost / totalPurchaseLiters) * 100) / 100 : 0;

    // 2. Customer Sales in period
    const salesAgg = await CustomerDelivery.aggregate([
      { $match: { date: { $gte: start, $lte: end }, status: { $in: ['Delivered', 'Changed Qty'] } } },
      {
        $group: {
          _id: null,
          totalLiters: { $sum: '$quantity' },
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    const totalSalesLiters = salesAgg[0] ? Math.round(salesAgg[0].totalLiters * 100) / 100 : 0;
    const totalSalesRevenue = salesAgg[0] ? Math.round(salesAgg[0].totalRevenue * 100) / 100 : 0;
    const avgSalePerLiter = totalSalesLiters > 0 ? Math.round((totalSalesRevenue / totalSalesLiters) * 100) / 100 : 0;

    // 3. Operating Expenses in period
    const expenseAgg = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalExpenses = Math.round(expenseAgg.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

    // 4. Margins & Economics
    const grossMargin = Math.round((totalSalesRevenue - totalPurchaseCost) * 100) / 100;
    const grossMarginPercentage = totalSalesRevenue > 0 ? Math.round((grossMargin / totalSalesRevenue) * 10000) / 100 : 0;
    const grossMarginPerLiter = Math.round((avgSalePerLiter - avgPurchasePerLiter) * 100) / 100;

    const estimatedNetMargin = Math.round((grossMargin - totalExpenses) * 100) / 100;
    const netMarginPercentage = totalSalesRevenue > 0 ? Math.round((estimatedNetMargin / totalSalesRevenue) * 10000) / 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        economics: {
          totalPurchaseLiters,
          totalPurchaseCost,
          avgPurchasePerLiter,
          totalSalesLiters,
          totalSalesRevenue,
          avgSalePerLiter,
          grossMargin,
          grossMarginPercentage,
          grossMarginPerLiter,
          totalExpenses,
          estimatedNetMargin,
          netMarginPercentage,
        },
        expenseBreakdown: expenseAgg.map(e => ({ category: e._id, amount: Math.round(e.amount * 100) / 100, count: e.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper for standard reports
const buildMatchStage = (query) => {
  const { startDate, endDate, shift, supplierCode, village } = query;
  let match = {};

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }

  if (shift) match.shift = shift;
  if (supplierCode) match.supplierCode = parseInt(supplierCode, 10);

  return match;
};

const commonGroupStage = {
  totalMilk: { $sum: '$milkQuantity' },
  totalAmount: { $sum: '$amount' },
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

// @desc    Get Daily / Monthly Charts Trend
// @route   GET /api/reports/charts
// @access  Private
exports.getChartsData = async (req, res) => {
  try {
    const dailyTrend = await MilkEntry.aggregate([
      {
        $group: {
          _id: '$date',
          milk: { $sum: '$milkQuantity' },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: -1 } },
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

    const topSuppliers = await MilkEntry.aggregate([
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
        dailyTrend: dailyTrend.reverse(),
        topSuppliers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Shift-wise Report
// @route   GET /api/reports/shift-wise
// @access  Private
exports.getShiftWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
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

// @desc    Supplier-wise Report
// @route   GET /api/reports/supplier-wise
// @access  Private
exports.getSupplierWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
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

// @desc    Village-wise Report
// @route   GET /api/reports/village-wise
// @access  Private
exports.getVillageWiseReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
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

// @desc    Monthly Report
// @route   GET /api/reports/monthly
// @access  Private
exports.getMonthlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substrCP: ['$date', 0, 7] },
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

// @desc    Yearly Report
// @route   GET /api/reports/yearly
// @access  Private
exports.getYearlyReport = async (req, res) => {
  try {
    const match = buildMatchStage(req.query);
    const report = await MilkEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substrCP: ['$date', 0, 4] },
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
