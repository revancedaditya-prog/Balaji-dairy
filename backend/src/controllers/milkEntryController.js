const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');
const { getISTDateTime } = require('../utils/dateTime');
const {
  isIsoDate,
  isTime,
  safeRegex,
  toFiniteNumber,
  toNonNegativeNumber,
  toPositiveInteger,
  toPositiveNumber,
} = require('../utils/validation');
const { sendControllerError } = require('../utils/http');

// Helper to detect shift
const detectShift = (timeStr) => {
  const hour = parseInt(timeStr.split(':')[0], 10);
  if (hour >= 4 && hour < 14) {
    return 'Morning';
  } else {
    return 'Evening';
  }
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

  let { date, time, shift } = req.body;

  try {
    const parsedSupplierCode = toPositiveInteger(supplierCode);
    const parsedQuantity = toPositiveNumber(milkQuantity);
    const parsedAmount = toPositiveNumber(req.body.amount);
    const parsedFat = fat === undefined || fat === null || fat === '' ? 0 : toNonNegativeNumber(fat);
    const parsedSnf = snf === undefined || snf === null || snf === '' ? 0 : toNonNegativeNumber(snf);

    if (!parsedSupplierCode || !parsedQuantity || !parsedAmount) {
      return res.status(400).json({ success: false, message: 'Please provide supplierCode, milkQuantity, and total amount' });
    }
    if (parsedFat === null || parsedSnf === null) {
      return res.status(400).json({ success: false, message: 'Fat and SNF cannot be negative or invalid' });
    }

    // Auto fetch supplier details
    const supplier = await Supplier.findOne({ supplierCode: parsedSupplierCode });
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
    if (!isIsoDate(date) || !isTime(time)) {
      return res.status(400).json({ success: false, message: 'Date or time format is invalid' });
    }
    if (!['Morning', 'Evening'].includes(shift)) {
      return res.status(400).json({ success: false, message: 'Shift must be Morning or Evening' });
    }

    const fRate = Math.round((parsedAmount / parsedQuantity) * 100) / 100;

    const newEntry = await MilkEntry.create({
      supplierCode: parsedSupplierCode,
      supplierName: supplier.supplierName,
      date,
      time,
      shift,
      milkQuantity: parsedQuantity,
      fat: parsedFat,
      snf: parsedSnf,
      rate: fRate,
      amount: parsedAmount,
      remarks,
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'MILK_ENTRY_ADD',
      `Milk Entry for Supplier #${parsedSupplierCode} (${shift} - ${date})`,
      null,
      newEntry
    );

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    sendControllerError(res, error);
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
      if ((startDate && !isIsoDate(startDate)) || (endDate && !isIsoDate(endDate))) {
        return res.status(400).json({ success: false, message: 'Date filters must use a valid YYYY-MM-DD date' });
      }
      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
      }
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // Shift filter
    if (shift) {
      if (!['Morning', 'Evening'].includes(shift)) {
        return res.status(400).json({ success: false, message: 'Shift must be Morning or Evening' });
      }
      query.shift = shift;
    }

    // Supplier Code filter
    if (supplierCode) {
      const parsedCode = toPositiveInteger(supplierCode);
      if (!parsedCode) return res.status(400).json({ success: false, message: 'Supplier code must be a positive integer' });
      query.supplierCode = parsedCode;
    }

    // Supplier Name filter (text match)
    if (supplierName) {
      query.supplierName = safeRegex(supplierName);
    }

    // Fat range filter
    if (minFat || maxFat) {
      query.fat = {};
      const parsedMinFat = minFat ? toFiniteNumber(minFat) : null;
      const parsedMaxFat = maxFat ? toFiniteNumber(maxFat) : null;
      if ((minFat && (parsedMinFat === null || parsedMinFat < 0)) || (maxFat && (parsedMaxFat === null || parsedMaxFat < 0))) {
        return res.status(400).json({ success: false, message: 'Fat range must contain non-negative numbers' });
      }
      if (parsedMinFat !== null && parsedMaxFat !== null && parsedMinFat > parsedMaxFat) {
        return res.status(400).json({ success: false, message: 'Minimum fat cannot exceed maximum fat' });
      }
      if (parsedMinFat !== null) query.fat.$gte = parsedMinFat;
      if (parsedMaxFat !== null) query.fat.$lte = parsedMaxFat;
    }

    // Rate range filter
    if (minRate || maxRate) {
      query.rate = {};
      const parsedMinRate = minRate ? toFiniteNumber(minRate) : null;
      const parsedMaxRate = maxRate ? toFiniteNumber(maxRate) : null;
      if ((minRate && (parsedMinRate === null || parsedMinRate < 0)) || (maxRate && (parsedMaxRate === null || parsedMaxRate < 0))) {
        return res.status(400).json({ success: false, message: 'Rate range must contain non-negative numbers' });
      }
      if (parsedMinRate !== null && parsedMaxRate !== null && parsedMinRate > parsedMaxRate) {
        return res.status(400).json({ success: false, message: 'Minimum rate cannot exceed maximum rate' });
      }
      if (parsedMinRate !== null) query.rate.$gte = parsedMinRate;
      if (parsedMaxRate !== null) query.rate.$lte = parsedMaxRate;
    }

    // Village filter (milk entries don't store village directly, so we find matching supplier codes)
    if (village) {
      const suppliersInVillage = await Supplier.find({
        village: safeRegex(village),
      }).select('supplierCode');

      const codes = suppliersInVillage.map((s) => s.supplierCode);
      if (typeof query.supplierCode === 'number') {
        if (!codes.includes(query.supplierCode)) query.supplierCode = { $in: [] };
      } else {
        query.supplierCode = { $in: codes };
      }
    }

    const entries = await MilkEntry.find(query).sort({ date: -1, time: -1 });
    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    sendControllerError(res, error);
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
    sendControllerError(res, error);
  }
};

// @desc    Update milk entry
// @route   PUT /api/milk-entries/:id
// @access  Private
exports.updateEntry = async (req, res) => {
  const { milkQuantity, fat, snf, date, time, shift, remarks } = req.body;
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Milk entry not found' });
    }

    const oldValue = entry.toObject();

    // Check supplier info if code updated (not standard but supported)
    if (req.body.supplierCode !== undefined) {
      const parsedSupplierCode = toPositiveInteger(req.body.supplierCode);
      if (!parsedSupplierCode) {
        return res.status(400).json({ success: false, message: 'Supplier code must be a positive integer' });
      }
      const supplier = await Supplier.findOne({ supplierCode: parsedSupplierCode });
      if (!supplier) {
        return res.status(404).json({ success: false, message: `Supplier Code #${req.body.supplierCode} does not exist` });
      }
      if (supplier.status !== 'active') {
        return res.status(400).json({ success: false, message: `Supplier #${parsedSupplierCode} is inactive` });
      }
      entry.supplierCode = supplier.supplierCode;
      entry.supplierName = supplier.supplierName;
    }

    if (date !== undefined) {
      if (!isIsoDate(date)) return res.status(400).json({ success: false, message: 'Date must be a valid YYYY-MM-DD date' });
      entry.date = date;
    }
    if (time !== undefined) {
      if (!isTime(time)) return res.status(400).json({ success: false, message: 'Time must use HH:MM or HH:MM:SS format' });
      entry.time = time;
      if (shift === undefined) entry.shift = detectShift(time);
    }
    if (shift !== undefined) {
      if (!['Morning', 'Evening'].includes(shift)) {
        return res.status(400).json({ success: false, message: 'Shift must be Morning or Evening' });
      }
      entry.shift = shift;
    }
    if (remarks !== undefined) entry.remarks = remarks;

    // Update fields
    if (milkQuantity !== undefined) {
      const parsedQuantity = toPositiveNumber(milkQuantity);
      if (!parsedQuantity) return res.status(400).json({ success: false, message: 'Milk quantity must be greater than zero' });
      entry.milkQuantity = parsedQuantity;
    }
    if (fat !== undefined) {
      const parsedFat = toNonNegativeNumber(fat);
      if (parsedFat === null) return res.status(400).json({ success: false, message: 'Fat cannot be negative or invalid' });
      entry.fat = parsedFat;
    }
    if (snf !== undefined) {
      const parsedSnf = toNonNegativeNumber(snf);
      if (parsedSnf === null) return res.status(400).json({ success: false, message: 'SNF cannot be negative or invalid' });
      entry.snf = parsedSnf;
    }
    if (req.body.amount !== undefined) {
      const parsedAmount = toPositiveNumber(req.body.amount);
      if (!parsedAmount) return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      entry.amount = parsedAmount;
    }

    // Recalculate rate based on updated amount and quantity
    entry.rate = Math.round((entry.amount / entry.milkQuantity) * 100) / 100;

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
    sendControllerError(res, error);
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
    sendControllerError(res, error);
  }
};
