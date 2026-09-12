const RateChart = require('../models/RateChart');
const logAudit = require('../utils/auditLogger');

const normalizeRate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const oneDecimal = (value) => Math.round(Number(value) * 10) / 10;

exports.setRate = async (req, res) => {
  try {
    const fat = normalizeRate(req.body.fat);
    const snf = normalizeRate(req.body.snf);
    const rate = normalizeRate(req.body.rate);
    if (fat === null || snf === null || rate === null) return res.status(400).json({ success: false, message: 'FAT, SNF and rate must be valid non-negative numbers' });

    const rFat = oneDecimal(fat);
    const rSnf = oneDecimal(snf);
    const rateEntry = await RateChart.findOneAndUpdate({ fat: rFat, snf: rSnf }, { rate }, { new: true, upsert: true, runValidators: true });
    await logAudit(`${req.user.name} (${req.user.phone})`, 'RATE_CHART_UPDATE', `Rate Fat ${rFat} / SNF ${rSnf}`, null, rateEntry);
    return res.status(200).json({ success: true, data: rateEntry });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save rate' });
  }
};

exports.bulkUpload = async (req, res) => {
  const { rates } = req.body;
  try {
    if (!Array.isArray(rates) || rates.length === 0) return res.status(400).json({ success: false, message: 'Please provide a non-empty array of rates' });
    if (rates.length > 10000) return res.status(413).json({ success: false, message: 'Rate upload is limited to 10000 rows per request' });

    const normalized = [];
    for (let i = 0; i < rates.length; i += 1) {
      const fat = normalizeRate(rates[i].fat);
      const snf = normalizeRate(rates[i].snf);
      const rate = normalizeRate(rates[i].rate);
      if (fat === null || snf === null || rate === null) return res.status(400).json({ success: false, message: `Invalid numeric value in rate row ${i + 1}` });
      normalized.push({ fat: oneDecimal(fat), snf: oneDecimal(snf), rate });
    }

    const operations = normalized.map((r) => ({ updateOne: { filter: { fat: r.fat, snf: r.snf }, update: { rate: r.rate }, upsert: true } }));
    await RateChart.bulkWrite(operations);
    await logAudit(`${req.user.name} (${req.user.phone})`, 'RATE_CHART_BULK_UPDATE', `Rate Chart bulk update with ${rates.length} rates`);
    return res.status(200).json({ success: true, message: `Successfully updated ${rates.length} rates` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update rate chart' });
  }
};

exports.lookupRate = async (req, res) => {
  try {
    const fat = normalizeRate(req.query.fat);
    const snf = normalizeRate(req.query.snf);
    if (fat === null || snf === null) return res.status(400).json({ success: false, message: 'Please provide valid FAT and SNF' });
    const rFat = oneDecimal(fat);
    const rSnf = oneDecimal(snf);
    const entry = await RateChart.findOne({ fat: rFat, snf: rSnf });
    if (!entry) return res.status(404).json({ success: false, message: `Rate not defined for Fat: ${rFat}, SNF: ${rSnf}`, rate: 0 });
    return res.status(200).json({ success: true, rate: entry.rate });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to look up rate' });
  }
};

exports.getRateChart = async (req, res) => {
  try {
    const entries = await RateChart.find({}).sort({ fat: 1, snf: 1 });
    return res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load rate chart' });
  }
};

exports.clearRateChart = async (req, res) => {
  try {
    const result = await RateChart.deleteMany({});
    await logAudit(`${req.user.name} (${req.user.phone})`, 'RATE_CHART_CLEAR', `Rate Chart cleared (${result.deletedCount} rows)`);
    return res.status(200).json({ success: true, message: 'Rate chart cleared successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to clear rate chart' });
  }
};

exports.deleteRate = async (req, res) => {
  try {
    const rateEntry = await RateChart.findById(req.params.id);
    if (!rateEntry) return res.status(404).json({ success: false, message: 'Rate entry not found' });
    await rateEntry.deleteOne();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'RATE_CHART_DELETE', `Rate entry Fat: ${rateEntry.fat}%, SNF: ${rateEntry.snf}%`);
    return res.status(200).json({ success: true, message: 'Rate deleted successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid rate entry or delete failed' });
  }
};
