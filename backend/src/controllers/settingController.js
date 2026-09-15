const Setting = require('../models/Setting');
const logAudit = require('../utils/auditLogger');

// @desc    Get dairy business settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({
        dairyName: 'BALAJI DAIRY',
        dairyHindiName: 'श्री बालाजी डेयरी',
        tagline: 'Fresh Milk & Pure Dairy Products',
      });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update dairy business settings
// @route   PUT /api/settings
// @access  Private (Owner only)
exports.updateSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    const oldData = setting ? setting.toObject() : null;

    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, { new: true, runValidators: true });
    }

    await logAudit(
      `${req.user.name} (${req.user.phone || req.user.email})`,
      'SETTINGS_UPDATE',
      'Updated Dairy Business Profile & Settings',
      oldData,
      setting
    );

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
