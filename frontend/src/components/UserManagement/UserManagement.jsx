import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Badge, Modal, EmptyState, Loading } from '../Common/MaterialComponents';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add/Edit Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'worker',
    status: 'active',
    password: '',
    confirmPassword: ''
  });

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await userService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      setError('Failed to fetch users directory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      role: 'worker',
      status: 'active',
      password: '',
      confirmPassword: ''
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setFormData({
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      password: '',
      confirmPassword: ''
    });
    setShowModal(true);
  };

  const handleOpenResetPassword = (user) => {
    setResetUserId(user._id);
    setResetUserName(user.name);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowResetModal(true);
  };

  const resetPasswordForm = () => {
    setResetUserId(null);
    setResetUserName('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowResetModal(false);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const res = await userService.resetPassword(resetUserId, newPassword);
      if (res.success) {
        setSuccess(`Password for user "${resetUserName}" has been reset successfully`);
        resetPasswordForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (editingId) {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        status: formData.status
      };

      try {
        const res = await userService.updateUser(editingId, payload);
        if (res.success) {
          setSuccess('User details updated successfully');
          loadUsers();
          resetForm();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to update user');
        console.error(err);
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      const payload = {
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        status: formData.status
      };

      try {
        const res = await userService.createUser(payload);
        if (res.success) {
          setSuccess('New user registered successfully');
          loadUsers();
          resetForm();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to register user');
        console.error(err);
      }
    }
  };

  const handleDelete = async (user) => {
    if (user._id === currentUser._id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${user.name}" (${user.phone})?`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await userService.deleteUser(user._id);
      if (res.success) {
        setSuccess(`User "${user.name}" deleted successfully`);
        loadUsers();
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    }
  };

  const getRoleBadgeType = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'manager': return 'success';
      default: return 'neutral';
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.phone.includes(search);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="users-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      {success && <div className="success-alert" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Search and Filters */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
          <Input
            label="Search Users"
            type="text"
            placeholder="Search by Name or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <label className="input-md3-label">Filter by Role</label>
            <select className="input-md3-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          <div>
            <label className="input-md3-label">Filter by Status</label>
            <select className="input-md3-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Desktop Only Registration button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }} className="desktop-only">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Add New User
          </Button>
        </div>
      </Card>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        className="fab-md3 mobile-only" 
        onClick={() => setShowModal(true)}
        aria-label="Add User"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
      </button>

      {/* Desktop List View */}
      <Card style={{ padding: '1rem' }} className="desktop-only">
        <div className="table-container">
          {loading ? (
            <Loading label="Fetching users directory..." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>System Role</th>
                  <th>Status</th>
                  <th>Registered On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className={u._id === currentUser._id ? 'active-row' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: '600' }}>{u.name}</span>
                          {u._id === currentUser._id && (
                            <Badge type="primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>You</Badge>
                          )}
                        </div>
                      </td>
                      <td>{u.phone}</td>
                      <td>
                        <Badge type={getRoleBadgeType(u.role)}>
                          {u.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge type={u.status === 'active' ? 'success' : 'error'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="outlined"
                          style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                          onClick={() => handleOpenResetPassword(u)}
                        >
                          Reset Pass
                        </Button>
                        <Button
                          variant="outlined"
                          style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                          onClick={() => handleEdit(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          style={{ padding: '0.25rem 0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                          onClick={() => handleDelete(u)}
                          disabled={u._id === currentUser._id}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                      No matching users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Mobile Card List View */}
      <div className="mobile-card-list mobile-only">
        {loading ? (
          <Loading label="Fetching users directory..." />
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div key={u._id} className="mobile-row-card" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
              <div className="mobile-row-card-header">
                <div className="mobile-row-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {u.name}
                  {u._id === currentUser._id && <Badge type="primary" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>You</Badge>}
                </div>
                <Badge type={u.status === 'active' ? 'success' : 'error'}>
                  {u.status}
                </Badge>
              </div>
              <div className="mobile-row-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>System Role:</span>
                  <Badge type={getRoleBadgeType(u.role)} style={{ fontSize: '0.7rem' }}>
                    {u.role.toUpperCase()}
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Phone Number:</span>
                  <a href={`tel:${u.phone}`} style={{ textDecoration: 'none', color: 'var(--md-sys-color-primary)', fontWeight: '600' }}>
                    {u.phone}
                  </a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '0.25rem' }}>
                  <span>Registered:</span>
                  <span>{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <div className="mobile-row-card-actions" style={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  style={{ padding: '0.25rem 0.5rem', minHeight: '36px', fontSize: '0.75rem', marginRight: '0.35rem' }}
                  onClick={() => handleOpenResetPassword(u)}
                >
                  Reset Pass
                </Button>
                <Button
                  variant="outlined"
                  style={{ padding: '0.25rem 0.5rem', minHeight: '36px', fontSize: '0.75rem', marginRight: '0.35rem' }}
                  onClick={() => handleEdit(u)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  style={{ padding: '0.25rem 0.5rem', minHeight: '36px', fontSize: '0.75rem' }}
                  onClick={() => handleDelete(u)}
                  disabled={u._id === currentUser._id}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="No matching users found in the system" />
        )}
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'Edit User Details' : 'Register New User'}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input
                label="Full Name*"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. Aditya Kumar"
              />
            </div>
            <Input
              label="Phone / Login Number*"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              placeholder="10-digit number"
            />
            <div className="form-group">
              <label className="input-md3-label">System Role*</label>
              <select
                name="role"
                className="input-md3-control"
                value={formData.role}
                onChange={handleInputChange}
                required
              >
                <option value="owner">Owner (Full Admin)</option>
                <option value="manager">Manager (Billing)</option>
                <option value="worker">Worker (Collector)</option>
              </select>
            </div>
            
            {!editingId && (
              <>
                <Input
                  label="Password*"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Min 6 characters"
                />
                <Input
                  label="Confirm Password*"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Repeat password"
                />
              </>
            )}

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-md3-label">Status*</label>
              <select
                name="status"
                className="input-md3-control"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="outlined" onClick={resetForm}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Register User'}</Button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={resetPasswordForm}
        title="Reset Password"
      >
        <form onSubmit={handleResetPasswordSubmit}>
          <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Set a new login password for user <b style={{ color: 'var(--md-sys-color-on-surface)' }}>{resetUserName}</b>.
          </p>
          <Input
            label="New Password*"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password*"
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="outlined" onClick={resetPasswordForm}>Cancel</Button>
            <Button type="submit" variant="primary">Reset Password</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
