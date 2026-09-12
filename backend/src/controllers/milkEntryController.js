const MilkEntry = require('../models/MilkEntry');
const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');

const getISTDateTime = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type) => parts.find((p) => p.type === type)?.value;
  return {
    dateStr: `${value('year')}-${value('month')}-${value('day')}`,
    timeStr: `${value('hour')}:${value('minute')}:${value('second')}`,
  };
};

const detectShift = (timeStr) => {
  const hour = parseInt(timeStr.split(':')[0], 10);
  return hour >= 4 && hour < 12 ? 'Morning' : 'Evening';
};

const parsePositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

exports.addEntry = async (req, res) => {
  const { supplierCode, remarks } = req.body;
  let { date, time, shift } = req.body;

  try {
    const quantity = parsePositiveNumber(req.body.milkQuantity);
    const amount = parsePositiveNumber(req.body.amount);
    const fat = parseOptionalNumber(req.body.fat);
    const snf = parseOptionalNumber(req.body.snf);
    const code = Number(supplierCode);

    if (!Number.isInteger(code) || code <= 0 || !quantity || !amount || fat === null || snf === null) {
      return res.status(400).json({ success: false, message: 'Please provide a valid supplier code, positive milk quantity/amount, and non-negative FAT/SNF' });
    }

    const supplier = await Supplier.findOne({ supplierCode: code });
    if (!supplier) return res.status(404).json({ success: false, message: `Supplier Code #${code} does not exist` });
    if (supplier.status !== 'active') return res.status(400).json({ success: false, message: `Supplier #${code} is inactive` });

    const ist = getISTDateTime();
    if (!date) date = ist.dateStr;
    if (!time) time = ist.timeStr;
    if (!shift) shift = detectShift(time);
    if (!['Morning', 'Evening'].includes(shift)) {
      return res.status(400).json({ success: false, message: 'Invalid shift' });
    }

    const rate = Math.round((amount / quantity) * 100) / 100;
    const newEntry = await MilkEntry.create({
      supplierCode: code,
      supplierName: supplier.supplierName,
      date,
      time,
      shift,
      milkQuantity: quantity,
      fat,
      snf,
      rate,
      amount,
      remarks: remarks || '',
      createdBy: req.user._id,
    });

    await logAudit(`${req.user.name} (${req.user.phone})`, 'MILK_ENTRY_ADD', `Milk Entry for Supplier #${code} (${shift} - ${date})`, null, newEntry);
    return res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error('Add milk entry failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save milk entry' });
  }
};

exports.getEntries = async (req, res) => {
  const { startDate, endDate, supplierCode, supplierName, shift, village, minFat, maxFat, minRate, maxRate } = req.query;
  try {
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    if (shift) query.shift = shift;
    if (supplierCode) {
      const code = Number(supplierCode);
      if (!Number.isInteger(code)) return res.status(400).json({ success: false, message: 'Invalid supplier code' });
      query.supplierCode = code;
    }
    if (supplierName) query.supplierName = new RegExp(supplierName, 'i');
    if (minFat || maxFat) {
      query.fat = {};
      if (minFat) query.fat.$gte = Number(minFat);
      if (maxFat) query.fat.$lte = Number(maxFat);
    }
    if (minRate || maxRate) {
      query.rate = {};
      if (minRate) query.rate.$gte = Number(minRate);
      if (maxRate) query.rate.$lte = Number(maxRate);
    }
    if (village) {
      const suppliers = await Supplier.find({ village: new RegExp(village, 'i') }).select('supplierCode');
      const codes = suppliers.map((s) => s.supplierCode);
      query.supplierCode = query.supplierCode ? { $in: codes.filter((c) => c === query.supplierCode) } : { $in: codes };
    }

    const entries = await MilkEntry.find(query).sort({ date: -1, time: -1 });
    return res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load milk entries' });
  }
};

exports.getEntryById = async (req, res) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Milk entry not found' });
    return res.status(200).json({ success: true, data: entry });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid milk entry id' });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Milk entry not found' });
    const oldValue = entry.toObject();

    if (req.body.supplierCode !== undefined && Number(req.body.supplierCode) !== entry.supplierCode) {
      const code = Number(req.body.supplierCode);
      const supplier = await Supplier.findOne({ supplierCode: code });
      if (!supplier || supplier.status !== 'active') return res.status(400).json({ success: false, message: 'Supplier does not exist or is inactive' });
      entry.supplierCode = supplier.supplierCode;
      entry.supplierName = supplier.supplierName;
    }

    if (req.body.date) entry.date = req.body.date;
    if (req.body.time) entry.time = req.body.time;
    if (req.body.shift) {
      if (!['Morning', 'Evening'].includes(req.body.shift)) return res.status(400).json({ success: false, message: 'Invalid shift' });
      entry.shift = req.body.shift;
    }
    if (req.body.remarks !== undefined) entry.remarks = req.body.remarks;

    if (req.body.milkQuantity !== undefined) {
      const value = parsePositiveNumber(req.body.milkQuantity);
      if (!value) return res.status(400).json({ success: false, message: 'Milk quantity must be greater than zero' });
      entry.milkQuantity = value;
    }
    if (req.body.amount !== undefined) {
      const value = parsePositiveNumber(req.body.amount);
      if (!value) return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      entry.amount = value;
    }
    if (req.body.fat !== undefined) {
      const value = parseOptionalNumber(req.body.fat);
      if (value === null) return res.status(400).json({ success: false, message: 'FAT cannot be negative' });
      entry.fat = value;
    }
    if (req.body.snf !== undefined) {
      const value = parseOptionalNumber(req.body.snf);
      if (value === null) return res.status(400).json({ success: false, message: 'SNF cannot be negative' });
      entry.snf = value;
    }

    entry.rate = Math.round((entry.amount / entry.milkQuantity) * 100) / 100;
    const updatedEntry = await entry.save();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'MILK_ENTRY_EDIT', `Milk Entry for Supplier #${entry.supplierCode} (${entry.shift} - ${entry.date})`, oldValue, updatedEntry);
    return res.status(200).json({ success: true, data: updatedEntry });
  } catch (error) {
    console.error('Update milk entry failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to update milk entry' });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const entry = await MilkEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Milk entry not found' });
    const oldValue = entry.toObject();
    await entry.deleteOne();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'MILK_ENTRY_DELETE', `Milk Entry for Supplier #${entry.supplierCode} (${entry.shift} - ${entry.date})`, oldValue, null);
    return res.status(200).json({ success: true, message: 'Milk entry deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete milk entry' });
  }
};
