const User = require('../models/User');
const logAudit = require('../utils/auditLogger');
const { normalizePhone } = require('../utils/validation');
const { sendControllerError } = require('../utils/http');

const VALID_ROLES = new Set(['owner', 'manager', 'worker']);
const VALID_STATUSES = new Set(['active', 'inactive']);

const isLastActiveOwner = async (user) => {
  if (user.role !== 'owner' || user.status !== 'active') return false;
  const otherActiveOwners = await User.countDocuments({
    _id: { $ne: user._id },
    role: 'owner',
    status: 'active',
  });
  return otherActiveOwners === 0;
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Owner Only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Owner Only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Owner Only)
exports.createUser = async (req, res) => {
  const { name, phone, password, role, status } = req.body;

  try {
    const normalizedPhone = normalizePhone(phone);
    if (!name?.trim() || !normalizedPhone || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Please provide name, phone, and password' });
    }
    if ((role && !VALID_ROLES.has(role)) || (status && !VALID_STATUSES.has(status))) {
      return res.status(400).json({ success: false, message: 'Invalid user role or status' });
    }

    // Check if phone number already registered
    const existing = await User.findOne({ phone: normalizedPhone });
    if (existing) {
      return res.status(400).json({ success: false, message: `Phone number ${phone} is already registered` });
    }

    const newUser = new User({
      name: name.trim(),
      phone: normalizedPhone,
      password,
      role: role || 'worker',
      status: status || 'active',
    });

    await newUser.save();

    // Log audit
    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'USER_CREATE',
      `User ${name.trim()} (${normalizedPhone})`,
      null,
      { name, phone, role: newUser.role, status: newUser.status }
    );

    // Remove password before returning
    const returnUser = newUser.toObject();
    delete returnUser.password;

    res.status(201).json({ success: true, data: returnUser });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private (Owner Only)
exports.updateUser = async (req, res) => {
  const { name, phone, role, status } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const oldValue = {
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    const normalizedPhone = phone === undefined ? undefined : normalizePhone(phone);
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'User name cannot be empty' });
    }
    if (phone !== undefined && !normalizedPhone) {
      return res.status(400).json({ success: false, message: 'Please provide a valid phone number' });
    }
    if ((role && !VALID_ROLES.has(role)) || (status && !VALID_STATUSES.has(status))) {
      return res.status(400).json({ success: false, message: 'Invalid user role or status' });
    }

    const targetIsSelf = user._id.toString() === req.user._id.toString();
    if (targetIsSelf && ((role && role !== 'owner') || status === 'inactive')) {
      return res.status(400).json({ success: false, message: 'You cannot remove your own owner access or deactivate your own account' });
    }

    const removesActiveOwner = user.role === 'owner' && user.status === 'active'
      && (role && role !== 'owner' || status === 'inactive');
    if (removesActiveOwner && await isLastActiveOwner(user)) {
      return res.status(400).json({ success: false, message: 'At least one active owner account must remain' });
    }

    // Check phone availability if updated
    if (normalizedPhone && normalizedPhone !== user.phone) {
      const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Phone number ${normalizedPhone} is already registered` });
      }
      user.phone = normalizedPhone;
    }

    if (name !== undefined) user.name = String(name).trim();
    if (role) user.role = role;
    if (status) user.status = status;

    await user.save();

    const newValue = {
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    // Log audit
    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'USER_EDIT',
      `User ${user.name} (${user.phone})`,
      oldValue,
      newValue
    );

    res.status(200).json({ success: true, data: newValue });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Owner Only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    if (await isLastActiveOwner(user)) {
      return res.status(400).json({ success: false, message: 'The last active owner account cannot be deleted' });
    }

    const oldValue = {
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    await user.deleteOne();

    // Log audit
    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'USER_DELETE',
      `User ${user.name} (${user.phone})`,
      oldValue,
      null
    );

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private (Owner Only)
exports.resetUserPassword = async (req, res) => {
  const { password } = req.body;

  try {
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Please provide a password of at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = password;
    await user.save(); // save calls bcrypt pre-save hashing

    // Log audit
    await logAudit(
      `${req.user.name} (${req.user.phone})`,
      'USER_PASSWORD_RESET',
      `User ${user.name} (${user.phone})`
    );

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    sendControllerError(res, error);
  }
};
