import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
      // Update existing user (ignore password fields)
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
      // Create new user (require password check)
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

  // Filtered Users listing logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.phone.includes(search);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="users-view">
      <div className="view-header">
        <div>
          <h1>User Management</h1>
          <p className="text-muted">Register and configure owner, manager, and worker accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
          Add New User
        </button>
      </div>

      {success && <div className="success-alert">{success}</div>}
      {error && <div className="error-alert">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="card filters-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Search Users</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Name or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Filter by Role</label>
            <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          <div>
            <label className="form-label">Filter by Status</label>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-loading">
            <div className="spinner"></div>
            <span>Fetching users directory...</span>
          </div>
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
                          <span className="badge badge-morning" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>You</span>
                        )}
                      </div>
                    </td>
                    <td>{u.phone}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status === 'active' ? 'active' : 'inactive'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleOpenResetPassword(u)}
                      >
                        Reset Password
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(u)}
                        disabled={u._id === currentUser._id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                    No matching users found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingId ? 'Edit User Details' : 'Register New User'}</h2>
              <button className="btn-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Full Name*</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Aditya Kumar"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone / Login Number*</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Role*</label>
                    <select
                      name="role"
                      className="form-control"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="owner">Owner (Full Admin Access)</option>
                      <option value="manager">Manager (Billing & Collections)</option>
                      <option value="worker">Worker (Milk Collector)</option>
                    </select>
                  </div>
                  
                  {!editingId && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Password*</label>
                        <input
                          type="password"
                          name="password"
                          className="form-control"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          placeholder="Min 6 characters"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm Password*</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          className="form-control"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          required
                          placeholder="Repeat password"
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label className="form-label">Status*</label>
                    <select
                      name="status"
                      className="form-control"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Register User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="btn-close" onClick={resetPasswordForm}>&times;</button>
            </div>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Set a new login password for user <b style={{ color: 'var(--text-main)' }}>{resetUserName}</b>.
                </p>
                <div className="form-group">
                  <label className="form-label">New Password*</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password*</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={resetPasswordForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
