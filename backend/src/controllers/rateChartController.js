const RateChart = require('../models/RateChart');
const logAudit = require('../utils/auditLogger');

// @desc    Set a single rate (create or update)
// @route   POST /api/rate-chart
// @access  Private
exports.setRate = async (req, res) => {
  const { fat, snf, rate } = req.body;

  try {
    if (fat === undefined || snf === undefined || rate === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide fat, snf and rate' });
    }

    // Round fat and snf to 1 decimal place
    const rFat = Math.round(fat * 10) / 10;
    const rSnf = Math.round(snf * 10) / 10;

    const rateEntry = await RateChart.findOneAndUpdate(
      { fat: rFat, snf: rSnf },
      { rate },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: rateEntry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk set/update rate chart
// @route   POST /api/rate-chart/bulk
// @access  Private
exports.bulkUpload = async (req, res) => {
  const { rates } = req.body; // Expecting array of { fat, snf, rate }

  try {
    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid array of rates' });
    }

    const operations = rates.map((r) => {
      const rFat = Math.round(r.fat * 10) / 10;
      const rSnf = Math.round(r.snf * 10) / 10;
      return {
        updateOne: {
          filter: { fat: rFat, snf: rSnf },
          update: { rate: r.rate },
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lookup rate based on fat & snf
// @route   GET /api/rate-chart/lookup
// @access  Private
exports.lookupRate = async (req, res) => {
  const { fat, snf } = req.query;

  try {
    if (!fat || !snf) {
      return res.status(400).json({ success: false, message: 'Please provide fat and snf' });
    }

    const rFat = Math.round(parseFloat(fat) * 10) / 10;
    const rSnf = Math.round(parseFloat(snf) * 10) / 10;

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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ success: false, message: error.message });
  }
};
