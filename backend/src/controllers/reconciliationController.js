const MilkReconciliation = require('../models/MilkReconciliation');
const MilkEntry = require('../models/MilkEntry');
const CustomerDelivery = require('../models/CustomerDelivery');
const InternalMilkUse = require('../models/InternalMilkUse');
const Setting = require('../models/Setting');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Calculate and get Daily Milk Reconciliation
// @route   GET /api/reconciliation/daily
// @access  Private
exports.getDailyReconciliation = async (req, res) => {
  const date = req.query.date || getISTDate();
  const shift = req.query.shift || 'Full Day'; // Morning, Evening, Full Day

  try {
    const setting = await Setting.findOne();
    const tolerance = setting?.varianceToleranceLiters || 5;

    // 1. Farmer Collections
    let matchMilk = { date };
    if (shift !== 'Full Day') matchMilk.shift = shift;
    const milkEntries = await MilkEntry.find(matchMilk);
    const farmerCollection = Math.round(milkEntries.reduce((sum, e) => sum + e.milkQuantity, 0) * 100) / 100;
    const collectionAmount = Math.round(milkEntries.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;

    // 2. Customer Sales
    let matchDel = { date, status: { $in: ['Delivered', 'Changed Qty'] } };
    if (shift !== 'Full Day') matchDel.shift = shift;
    const deliveries = await CustomerDelivery.find(matchDel);
    const customerSales = Math.round(deliveries.reduce((sum, d) => sum + d.quantity, 0) * 100) / 100;
    const salesAmount = Math.round(deliveries.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;

    // 3. Internal Use / Wastage
    let matchInternal = { date };
    if (shift !== 'Full Day') matchInternal.shift = shift;
    const internalEntries = await InternalMilkUse.find(matchInternal);

    const internalUse = Math.round(internalEntries.filter(i => i.purpose !== 'Wastage').reduce((sum, i) => sum + i.quantity, 0) * 100) / 100;
    const wastage = Math.round(internalEntries.filter(i => i.purpose === 'Wastage').reduce((sum, i) => sum + i.quantity, 0) * 100) / 100;

    // 4. Saved Reconciliation overrides if any
    const saved = await MilkReconciliation.findOne({ date, shift });

    const openingMilk = saved ? saved.openingMilk : 0;
    const otherIncoming = saved ? saved.otherIncoming : 0;
    const closingMilk = saved ? saved.closingMilk : 0;

    const totalAvailable = Math.round((openingMilk + farmerCollection + otherIncoming) * 100) / 100;
    const totalAccounted = Math.round((customerSales + internalUse + wastage + closingMilk) * 100) / 100;
    const variance = Math.round((totalAvailable - totalAccounted) * 100) / 100;
    const variancePercentage = totalAvailable > 0 ? Math.round((variance / totalAvailable) * 10000) / 100 : 0;

    let status = 'Balanced';
    if (Math.abs(variance) > tolerance) {
      status = 'Excess Variance';
    } else if (Math.abs(variance) > 0) {
      status = 'Acceptable';
    }

    res.status(200).json({
      success: true,
      data: {
        date,
        shift,
        tolerance,
        openingMilk,
        farmerCollection,
        collectionAmount,
        otherIncoming,
        totalAvailable,
        customerSales,
        salesAmount,
        internalUse,
        wastage,
        closingMilk,
        totalAccounted,
        variance,
        variancePercentage,
        status,
        internalEntries,
        notes: saved?.notes || '',
        isVerified: !!saved?.verifiedBy,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save verified reconciliation record
// @route   POST /api/reconciliation
// @access  Private
exports.saveReconciliation = async (req, res) => {
  const { date, shift, openingMilk, otherIncoming, closingMilk, wastage, notes } = req.body;

  try {
    const record = await MilkReconciliation.findOneAndUpdate(
      { date, shift: shift || 'Full Day' },
      {
        openingMilk: Number(openingMilk) || 0,
        otherIncoming: Number(otherIncoming) || 0,
        closingMilk: Number(closingMilk) || 0,
        wastage: Number(wastage) || 0,
        notes: notes || '',
        verifiedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'RECONCILIATION_SAVE',
      `Saved milk reconciliation for ${date} (${shift})`
    );

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reconciliation history
// @route   GET /api/reconciliation/history
// @access  Private
exports.getReconciliationHistory = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const history = await MilkReconciliation.find(query).sort({ date: -1 });
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
