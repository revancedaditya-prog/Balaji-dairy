import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { userService } from '../../services/api';
import { PageHeader, SearchInput, Modal, ConfirmationDialog, StatusBadge } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'worker',
    status: 'active',
  });

  // Password Reset Modal
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Delete Dialog
  const [deleteId, setDeleteId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch user accounts');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'worker',
      status: 'active',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      phone: u.phone,
      email: u.email || '',
      password: '',
      role: u.role,
      status: u.status,
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showWarning('Please enter name and phone number');
      return;
    }

    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        const res = await userService.updateUser(editingUser._id, payload);
        if (res.success) {
          showSuccess(`Updated user account ${formData.name}`);
        }
      } else {
        if (!formData.password || formData.password.length < 6) {
          showWarning('Password must be at least 6 characters');
          return;
        }
        const res = await userService.createUser(formData);
        if (res.success) {
          showSuccess(`Created ${formData.role} account for ${formData.name}`);
        }
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save user account');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showWarning('New password must be at least 6 characters');
      return;
    }

    try {
      const res = await userService.resetPassword(resetUserId, newPassword);
      if (res.success) {
        showSuccess('Password has been reset successfully');
        setResetUserId(null);
        setNewPassword('');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await userService.deleteUser(deleteId);
      if (res.success) {
        showSuccess('User account deleted');
        setDeleteId(null);
        fetchUsers();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    return (
      !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="User & Role Management"
        hindiTitle="सिस्टम उपयोगकर्ता व भूमिकाएँ"
        subtitle="Manage login access and role permissions (Owner, Manager, Worker) for dairy operations."
        actions={
          <button onClick={handleOpenAdd} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
            <Plus size={16} strokeWidth={3} />
            <span>+ Add New User</span>
          </button>
        }
      />

      {/* Role Explanations Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #D4AF37' }}>
          <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.9rem' }}>OWNER ROLE (मालिक)</div>
          <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Full system control, profit margins, rate overrides, user management, and security settings.
          </p>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #0284C7' }}>
          <div style={{ fontWeight: 800, color: '#0284C7', fontSize: '0.9rem' }}>MANAGER ROLE (प्रबंधक)</div>
          <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Daily operations, collections, delivery routes, customer billing, payments, and reports.
          </p>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontWeight: 800, color: '#10B981', fontSize: '0.9rem' }}>WORKER ROLE (कर्मचारी)</div>
          <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Fast daily milk collection and customer delivery entries only. Sensitive financials hidden.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by user name, phone, email, or role..."
        />
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{u.name}</div>
                    </td>
                    <td className="font-mono-num">{u.phone}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{u.email || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'owner' ? 'badge-gold' : u.role === 'manager' ? 'badge-info' : 'badge-neutral'}`} style={{ fontWeight: 800 }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => {
                            setResetUserId(u._id);
                            setNewPassword('');
                          }}
                          className="btn-icon-sm btn-secondary"
                          title="Reset Password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn-icon-sm btn-ghost"
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>
                        {u._id !== currentUser?._id && (
                          <button
                            onClick={() => setDeleteId(u._id)}
                            className="btn-icon-sm btn-ghost"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? `Edit Account: ${formData.name}` : 'Create New System User'}
      >
        <form onSubmit={handleSubmitForm}>
          <div className="form-group">
            <label className="form-label">Full Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Login ID) <span className="required">*</span></label>
            <input
              type="tel"
              className="form-control"
              placeholder="10-digit mobile number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. operator@balaji.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role Permission <span className="required">*</span></label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="worker">Worker (दैनिक संकलन व वितरण)</option>
              <option value="manager">Manager (प्रबंधक - खाते व रिपोर्ट)</option>
              <option value="owner">Owner (मालिक - पूर्ण नियंत्रण)</option>
            </select>
          </div>

          {!editingUser && (
            <div className="form-group">
              <label className="form-label">Initial Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Account Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active (सक्रिय)</option>
              <option value="inactive">Inactive (निष्क्रिय)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetUserId}
        onClose={() => setResetUserId(null)}
        title="Reset User Password"
      >
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">Enter New Password <span className="required">*</span></label>
            <input
              type="password"
              className="form-control"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setResetUserId(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" style={{ minWidth: '130px' }}>
              Save Password
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete User Account"
        message="Are you sure you want to delete this user account? They will immediately lose access to the system."
        confirmText="Delete Account"
        isDanger={true}
      />
    </div>
  );
};

export default UserManagement;
