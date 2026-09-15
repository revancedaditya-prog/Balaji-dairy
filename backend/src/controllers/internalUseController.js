const InternalMilkUse = require('../models/InternalMilkUse');
const logAudit = require('../utils/auditLogger');

const getISTDate = () => {
  const dateObj = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + offset);
  return istDate.toISOString().split('T')[0];
};

// @desc    Get internal milk entries
// @route   GET /api/internal-use
// @access  Private
exports.getInternalUse = async (req, res) => {
  const { date, startDate, endDate, purpose, shift } = req.query;

  try {
    let query = {};
    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (purpose) query.purpose = purpose;
    if (shift) query.shift = shift;

    const entries = await InternalMilkUse.find(query).sort({ date: -1, createdAt: -1 });
    const totalMilk = Math.round(entries.reduce((sum, e) => sum + e.quantity, 0) * 100) / 100;

    res.status(200).json({ success: true, count: entries.length, totalMilk, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add internal milk use record
// @route   POST /api/internal-use
// @access  Private
exports.addInternalUse = async (req, res) => {
  const { date, shift, purpose, quantity, fat, productOutputQty, productOutputUnit, notes } = req.body;

  try {
    if (!purpose || !quantity) {
      return res.status(400).json({ success: false, message: 'Purpose and quantity are required' });
    }

    const entry = await InternalMilkUse.create({
      date: date || getISTDate(),
      shift: shift || 'Morning',
      purpose,
      quantity: Number(quantity),
      fat: Number(fat) || 0,
      productOutputQty: Number(productOutputQty) || 0,
      productOutputUnit: productOutputUnit || 'kg',
      notes: notes || '',
      createdBy: req.user._id,
    });

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'INTERNAL_MILK_USE',
      `Internal milk logged: ${quantity}L for ${purpose}`
    );

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update internal milk use record
// @route   PUT /api/internal-use/:id
// @access  Private
exports.updateInternalUse = async (req, res) => {
  try {
    const entry = await InternalMilkUse.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const updated = await InternalMilkUse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete internal milk use record
// @route   DELETE /api/internal-use/:id
// @access  Private (Owner/Manager only)
exports.deleteInternalUse = async (req, res) => {
  try {
    const entry = await InternalMilkUse.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    await InternalMilkUse.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
