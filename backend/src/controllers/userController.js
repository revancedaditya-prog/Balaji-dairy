const User = require('../models/User');
const logAudit = require('../utils/auditLogger');

const validRoles = ['owner', 'manager', 'worker'];
const validStatuses = ['active', 'inactive'];

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid user id' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = req.body.password;
    const role = req.body.role || 'worker';
    const status = req.body.status || 'active';

    if (!name || !phone || !password || password.length < 6) return res.status(400).json({ success: false, message: 'Name, phone and a password of at least 6 characters are required' });
    if (!validRoles.includes(role) || !validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid role or status' });
    if (await User.exists({ phone })) return res.status(400).json({ success: false, message: `Phone number ${phone} is already registered` });

    const newUser = await User.create({ name, phone, password, role, status });
    await logAudit(`${req.user.name} (${req.user.phone})`, 'USER_CREATE', `User ${name} (${phone})`, null, { name, phone, role, status });
    const returnUser = newUser.toObject();
    delete returnUser.password;
    return res.status(201).json({ success: true, data: returnUser });
  } catch (error) {
    console.error('Create user failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldValue = { name: user.name, phone: user.phone, role: user.role, status: user.status };
    const isSelf = String(user._id) === String(req.user._id);
    const nextRole = req.body.role || user.role;
    const nextStatus = req.body.status || user.status;

    if (!validRoles.includes(nextRole) || !validStatuses.includes(nextStatus)) return res.status(400).json({ success: false, message: 'Invalid role or status' });
    if (isSelf && (nextRole !== 'owner' || nextStatus !== 'active')) {
      return res.status(400).json({ success: false, message: 'You cannot demote or deactivate your own owner account' });
    }

    if (user.role === 'owner' && user.status === 'active' && (nextRole !== 'owner' || nextStatus !== 'active')) {
      const activeOwners = await User.countDocuments({ role: 'owner', status: 'active' });
      if (activeOwners <= 1) return res.status(409).json({ success: false, message: 'At least one active owner account must remain' });
    }

    if (req.body.phone !== undefined) {
      const phone = String(req.body.phone).trim();
      if (!phone) return res.status(400).json({ success: false, message: 'Phone number cannot be empty' });
      if (phone !== user.phone && await User.exists({ phone })) return res.status(400).json({ success: false, message: `Phone number ${phone} is already registered` });
      user.phone = phone;
    }
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      user.name = name;
    }
    user.role = nextRole;
    user.status = nextStatus;
    await user.save();

    const newValue = { name: user.name, phone: user.phone, role: user.role, status: user.status };
    await logAudit(`${req.user.name} (${req.user.phone})`, 'USER_EDIT', `User ${user.name} (${user.phone})`, oldValue, newValue);
    return res.status(200).json({ success: true, data: newValue });
  } catch (error) {
    console.error('Update user failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user._id) === String(req.user._id)) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    if (user.role === 'owner' && user.status === 'active') {
      const activeOwners = await User.countDocuments({ role: 'owner', status: 'active' });
      if (activeOwners <= 1) return res.status(409).json({ success: false, message: 'At least one active owner account must remain' });
    }

    const oldValue = { name: user.name, phone: user.phone, role: user.role, status: user.status };
    await user.deleteOne();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'USER_DELETE', `User ${user.name} (${user.phone})`, oldValue, null);
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Please provide a password of at least 6 characters' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = password;
    await user.save();
    await logAudit(`${req.user.name} (${req.user.phone})`, 'USER_PASSWORD_RESET', `User ${user.name} (${user.phone})`);
    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
