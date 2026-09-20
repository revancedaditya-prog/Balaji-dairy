const RateChart = require('../models/RateChart');
const logAudit = require('../utils/auditLogger');
const { toNonNegativeNumber } = require('../utils/validation');
const { sendControllerError } = require('../utils/http');

// @desc    Set a single rate (create or update)
// @route   POST /api/rate-chart
// @access  Private
exports.setRate = async (req, res) => {
  const { fat, snf, rate } = req.body;

  try {
    if (fat === undefined || snf === undefined || rate === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide fat, snf and rate' });
    }

    const parsedFat = toNonNegativeNumber(fat);
    const parsedSnf = toNonNegativeNumber(snf);
    const parsedRate = toNonNegativeNumber(rate);
    if (parsedFat === null || parsedSnf === null || parsedRate === null) {
      return res.status(400).json({ success: false, message: 'Fat, SNF and rate must be valid non-negative numbers' });
    }

    // Round fat and snf to 1 decimal place
    const rFat = Math.round(parsedFat * 10) / 10;
    const rSnf = Math.round(parsedSnf * 10) / 10;

    const rateEntry = await RateChart.findOneAndUpdate(
      { fat: rFat, snf: rSnf },
      { rate: parsedRate },
      { new: true, upsert: true, runValidators: true }
    );

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'RATE_CHART_SET',
      `Rate entry Fat: ${rFat}%, SNF: ${rSnf}%`,
      null,
      rateEntry
    );

    res.status(200).json({ success: true, data: rateEntry });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Bulk set/update rate chart
// @route   POST /api/rate-chart/bulk
// @access  Private
exports.bulkUpload = async (req, res) => {
  const { rates } = req.body; // Expecting array of { fat, snf, rate }

  try {
    if (!Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid array of rates' });
    }
    if (rates.length > 2000) {
      return res.status(413).json({ success: false, message: 'A maximum of 2,000 rate rows can be uploaded at once' });
    }

    const normalizedRates = rates.map((entry) => ({
      fat: toNonNegativeNumber(entry.fat),
      snf: toNonNegativeNumber(entry.snf),
      rate: toNonNegativeNumber(entry.rate),
    }));
    if (normalizedRates.some((entry) => entry.fat === null || entry.snf === null || entry.rate === null)) {
      return res.status(400).json({ success: false, message: 'Every rate row must contain valid non-negative fat, SNF and rate values' });
    }

    const operations = normalizedRates.map((entry) => {
      const rFat = Math.round(entry.fat * 10) / 10;
      const rSnf = Math.round(entry.snf * 10) / 10;
      return {
        updateOne: {
          filter: { fat: rFat, snf: rSnf },
          update: { rate: entry.rate },
          upsert: true,
        },
      };
    });

    await RateChart.bulkWrite(operations);

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'RATE_CHART_BULK_UPDATE',
      `Rate Chart bulk update with ${rates.length} rates`
    );

    res.status(200).json({ success: true, message: `Successfully updated ${rates.length} rates` });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Lookup rate based on fat & snf
// @route   GET /api/rate-chart/lookup
// @access  Private
exports.lookupRate = async (req, res) => {
  const { fat, snf } = req.query;

  try {
    if (fat === undefined || snf === undefined || fat === '' || snf === '') {
      return res.status(400).json({ success: false, message: 'Please provide fat and snf' });
    }

    const parsedFat = toNonNegativeNumber(fat);
    const parsedSnf = toNonNegativeNumber(snf);
    if (parsedFat === null || parsedSnf === null) {
      return res.status(400).json({ success: false, message: 'Fat and SNF must be valid non-negative numbers' });
    }

    const rFat = Math.round(parsedFat * 10) / 10;
    const rSnf = Math.round(parsedSnf * 10) / 10;

    const entry = await RateChart.findOne({ fat: rFat, snf: rSnf });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: `Rate not defined for Fat: ${rFat}, SNF: ${rSnf}`,
        rate: 0,
      });
    }

    res.status(200).json({ success: true, rate: entry.rate });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Get complete rate chart list
// @route   GET /api/rate-chart
// @access  Private
exports.getRateChart = async (req, res) => {
  try {
    const entries = await RateChart.find({}).sort({ fat: 1, snf: 1 });
    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Clear entire rate chart
// @route   DELETE /api/rate-chart
// @access  Private
exports.clearRateChart = async (req, res) => {
  try {
    await RateChart.deleteMany({});

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'RATE_CHART_CLEAR',
      'Rate Chart completely wiped'
    );

    res.status(200).json({ success: true, message: 'Rate chart cleared successfully' });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Delete a single rate
// @route   DELETE /api/rate-chart/:id
// @access  Private (Owner Only)
exports.deleteRate = async (req, res) => {
  try {
    const rateEntry = await RateChart.findById(req.params.id);
    if (!rateEntry) {
      return res.status(404).json({ success: false, message: 'Rate entry not found' });
    }

    await rateEntry.deleteOne();

    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'RATE_CHART_DELETE',
      `Rate entry Fat: ${rateEntry.fat}%, SNF: ${rateEntry.snf}%`
    );

    res.status(200).json({ success: true, message: 'Rate deleted successfully' });
  } catch (error) {
    sendControllerError(res, error);
  }
};
