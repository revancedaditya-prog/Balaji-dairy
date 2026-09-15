const QualityTest = require('../models/QualityTest');
const Supplier = require('../models/Supplier');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Get quality test records
// @route   GET /api/quality-tests
// @access  Private
exports.getQualityTests = async (req, res) => {
  const { supplierCode, date, startDate, endDate, status } = req.query;

  try {
    let query = {};
    if (supplierCode) query.supplierCode = parseInt(supplierCode, 10);
    if (status) query.status = status;
    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const tests = await QualityTest.find(query).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add quality test record
// @route   POST /api/quality-tests
// @access  Private
exports.addQualityTest = async (req, res) => {
  const {
    supplierCode,
    date,
    shift,
    fat,
    snf,
    clr,
    temperature,
    acidity,
    waterAdulteration,
    neutralizer,
    urea,
    starch,
    detergent,
    remarks,
  } = req.body;

  try {
    if (!supplierCode) {
      return res.status(400).json({ success: false, message: 'Supplier code is required' });
    }

    const supplier = await Supplier.findOne({ supplierCode: parseInt(supplierCode, 10) });
    if (!supplier) {
      return res.status(404).json({ success: false, message: `Supplier #${supplierCode} not found` });
    }

    // Determine status automatically
    let testStatus = 'Passed';
    if (
      neutralizer === 'Positive' ||
      urea === 'Positive' ||
      starch === 'Positive' ||
      detergent === 'Positive' ||
      Number(waterAdulteration) > 10
    ) {
      testStatus = 'Rejected';
    } else if (Number(waterAdulteration) > 3 || Number(fat) < 3.0 || Number(snf) < 8.0) {
      testStatus = 'Warning';
    }

    const test = await QualityTest.create({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      date: date || getISTDate(),
      shift: shift || 'Morning',
      fat: Number(fat) || 0,
      snf: Number(snf) || 0,
      clr: Number(clr) || 0,
      temperature: Number(temperature) || 0,
      acidity: Number(acidity) || 0,
      waterAdulteration: Number(waterAdulteration) || 0,
      neutralizer: neutralizer || 'Negative',
      urea: urea || 'Negative',
      starch: starch || 'Negative',
      detergent: detergent || 'Negative',
      status: testStatus,
      remarks: remarks || '',
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'QUALITY_TEST_ADD',
      `Milk test logged for ${supplier.supplierName} (#${supplierCode}) - Result: ${testStatus}`
    );

    res.status(201).json({ success: true, data: test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete quality test record
// @route   DELETE /api/quality-tests/:id
// @access  Private (Owner/Manager only)
exports.deleteQualityTest = async (req, res) => {
  try {
    const test = await QualityTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    await QualityTest.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Test record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
