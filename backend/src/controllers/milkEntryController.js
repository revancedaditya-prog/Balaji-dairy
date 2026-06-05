const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const RateChart = require('../models/RateChart');
const logAudit = require('../utils/auditLogger');

// Helper to get current Indian standard date and time
const getISTDateTime = () => {
  const dateObj = new Date();
  // Format YYYY-MM-DD
  const offset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  const istDate = new Date(dateObj.getTime() + offset);
  const dateStr = istDate.toISOString().split('T')[0];
  const timeStr = istDate.toISOString().split('T')[1].substring(0, 8);
  return { dateStr, timeStr };
};

// Helper to detect shift
const detectShift = (timeStr) => {
  const hour = parseInt(timeStr.split(':')[0], 10);
  if (hour >= 4 && hour < 12) {
    return 'Morning';
  } else {
    return 'Evening';
  }
};

// Helper to look up rate
const getRate = async (fat, snf) => {
  const rFat = Math.round(fat * 10) / 10;
  const rSnf = Math.round(snf * 10) / 10;
  const entry = await RateChart.findOne({ fat: rFat, snf: rSnf });
  return entry ? entry.rate : 0;
};

// @desc    Add new milk entry
// @route   POST /api/milk-entries
// @access  Private
exports.addEntry = async (req, res) => {
  const {
    supplierCode,
    milkQuantity,
    fat,
    snf,
    remarks,
  } = req.body;

  let { date, time, shift, rate } = req.body;

  try {
    if (!supplierCode || !milkQuantity || fat === undefined || snf === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide supplierCode, milkQuantity, fat, and snf' });
    }

    // Auto fetch supplier details
    const supplier = await Supplier.findOne({ supplierCode });
    if (!supplier) {
      return res.status(404).json({ success: false, message: `Supplier Code #${supplierCode} does not exist` });
    }

    if (supplier.status !== 'active') {
      return res.status(400).json({ success: false, message: `Supplier #${supplierCode} is inactive` });
    }

    // Auto fill date & time if not provided
    const ist = getISTDateTime();
    if (!date) date = ist.dateStr;
    if (!time) time = ist.timeStr;

    // Auto detect shift
    if (!shift) {
      shift = detectShift(time);
    }

    // Determine rate from chart if not manually forced
    if (rate === undefined || rate === null || rate === 0) {
      rate = await getRate(fat, snf);
      if (rate === 0) {
        return res.status(400).json({
          success: false,
          message: `Rate not defined in chart for Fat: ${fat}, SNF: ${snf}. Please set rate in Rate Chart first.`,
        });
      }
    }

    // Calculate amount (prefer manually passed amount if provided)
    const amount = req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== 0
      ? parseFloat(req.body.amount)
      : Math.round(milkQuantity * rate * 100) / 100;

    const newEntry = await MilkEntry.create({
      supplierCode,
      supplierName: supplier.supplierName,
      date,
      time,
      shift,
      milkQuantity,
      fat,
      snf,
      rate,
      amount,
      remarks,
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'MILK_ENTRY_ADD',
      `Milk Entry for Supplier #${supplierCode} (${shift} - ${date})`,
      null,
      newEntry
    );

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get milk entries with advanced filters & search
// @route   GET /api/milk-entries
// @access  Private
exports.getEntries = async (req, res) => {
  const {
    startDate,
    endDate,
    supplierCode,
    supplierName,
    shift,
    village,
    minFat,
    maxFat,
    minRate,
    maxRate,
  } = req.query;

  try {
    let query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // Shift filter
    if (shift) {
      query.shift = shift;
    }

    // Supplier Code filter
    if (supplierCode) {
      query.supplierCode = parseInt(supplierCode, 10);
    }

    // Supplier Name filter (text match)
    if (supplierName) {
      query.supplierName = new RegExp(supplierName, 'i');
    }

    // Fat range filter
    if (minFat || maxFat) {
      query.fat = {};
      if (minFat) query.fat.$gte = parseFloat(minFat);
      if (maxFat) query.fat.$lte = parseFloat(maxFat);
    }

    // Rate range filter
    if (minRate || maxRate) {
      query.rate = {};
      if (minRate) query.rate.$gte = parseFloat(minRate);
      if (maxRate) query.rate.$lte = parseFloat(maxRate);
    }

    // Village filter (milk entries don't store village directly, so we find matching supplier codes)
    if (village) {
      const suppliersInVillage = await Supplier.find({
        village: new RegExp(village, 'i'),
      }).select('supplierCode');

      const codes = suppliersInVillage.map((s) => s.supplierCode);
      query.supplierCode = { $in: codes };
    }

    const entries = await MilkEntry.find(query).sort({ date: -1, time: -1 });
    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single milk entry
// @route   GET /api/milk-entries/:id
// @access  Private
exports.getEntryById = async (req, res) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Milk entry not found' });
    }
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update milk entry
// @route   PUT /api/milk-entries/:id
// @access  Private
exports.updateEntry = async (req, res) => {
  const { milkQuantity, fat, snf, date, time, shift, remarks } = req.body;
  let { rate } = req.body;

  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Milk entry not found' });
    }

    const oldValue = entry.toObject();

    // Check supplier info if code updated (not standard but supported)
    if (req.body.supplierCode && req.body.supplierCode !== entry.supplierCode) {
      const supplier = await Supplier.findOne({ supplierCode: req.body.supplierCode });
      if (!supplier) {
        return res.status(404).json({ success: false, message: `Supplier Code #${req.body.supplierCode} does not exist` });
      }
      entry.supplierCode = supplier.supplierCode;
      entry.supplierName = supplier.supplierName;
    }

    if (date) entry.date = date;
    if (time) entry.time = time;
    if (shift) entry.shift = shift;
    if (remarks !== undefined) entry.remarks = remarks;

    // Recompute rate & amount if quantity, fat or snf changes
    if (milkQuantity !== undefined) entry.milkQuantity = milkQuantity;
    if (fat !== undefined) entry.fat = fat;
    if (snf !== undefined) entry.snf = snf;

    // Recalculate rate
    if (fat !== undefined || snf !== undefined) {
      if (rate === undefined || rate === null || rate === 0) {
        rate = await getRate(entry.fat, entry.snf);
        if (rate === 0) {
          return res.status(400).json({
            success: false,
            message: `Rate not defined in chart for Fat: ${entry.fat}, SNF: ${entry.snf}.`,
          });
        }
      }
      entry.rate = rate;
    } else if (rate !== undefined) {
      entry.rate = rate;
    }

    entry.amount = req.body.amount !== undefined && req.body.amount !== null
      ? parseFloat(req.body.amount)
      : Math.round(entry.milkQuantity * entry.rate * 100) / 100;

    const updatedEntry = await entry.save();

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'MILK_ENTRY_EDIT',
      `Milk Entry for Supplier #${entry.supplierCode} (${entry.shift} - ${entry.date})`,
      oldValue,
      updatedEntry
    );

    res.status(200).json({ success: true, data: updatedEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete milk entry
// @route   DELETE /api/milk-entries/:id
// @access  Private
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Milk entry not found' });
    }

    const oldValue = entry.toObject();

    await entry.deleteOne();

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'MILK_ENTRY_DELETE',
      `Milk Entry for Supplier #${entry.supplierCode} (${entry.shift} - ${entry.date})`,
      oldValue,
      null
    );

    res.status(200).json({ success: true, message: 'Milk entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
