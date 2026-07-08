import React, { useState, useEffect } from 'react';
import { authService, backupService, auditService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Badge, Loading, EmptyState } from '../Common/MaterialComponents';

const Settings = ({ setActiveTab }) => {
  const { user, logout } = useAuth();

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Backup/Restore State
  const [restoreFile, setRestoreFile] = useState(null);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);

  // Audit Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [logAction, setLogAction] = useState('');

  // Active section toggles for mobile accordion settings groups
  const [activeGroup, setActiveGroup] = useState('profile'); // profile, security, backup, logs

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long');
      return;
    }

    try {
      setPassLoading(true);
      const res = await authService.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPassSuccess('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleBackupDownload = async () => {
    setBackupError('');
    setBackupSuccess('');
    try {
      setBackupLoading(true);
      const blob = await backupService.triggerExport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `balaji_dairy_backup_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setBackupSuccess('Database backup file downloaded successfully');
    } catch (err) {
      setBackupError('Failed to trigger database export');
      console.error(err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setRestoreFile(e.target.files[0]);
  };

  const handleRestoreUpload = async (e) => {
    e.preventDefault();
    setBackupError('');
    setBackupSuccess('');

    if (!restoreFile) {
      setBackupError('Please select a backup JSON file first');
      return;
    }

    if (!window.confirm('WARNING: Restoring a backup will wipe current tables (except active login user) and replace them with backup records. Proceed?')) {
      return;
    }

    setBackupLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupJson = JSON.parse(event.target.result);
        const res = await backupService.restore(backupJson);
        if (res.success) {
          setBackupSuccess(`Database restored successfully: Loaded ${res.stats.suppliers} suppliers, ${res.stats.milkEntries} milk entries.`);
          setRestoreFile(null);
          e.target.reset();
          loadLogs(); // Reload audit logs
        }
      } catch (err) {
        setBackupError(err.response?.data?.message || 'Error occurred during restore: Invalid backup file structure.');
        console.error(err);
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(restoreFile);
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await auditService.getLogs({ search: logSearch, action: logAction });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadLogs();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [logSearch, logAction]);

  return (
    <div className="settings-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      
      {/* Mobile Settings Accordion / List Groups */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Profile Card */}
        <Card style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '1.1rem'
            }}>
              {user?.name ? user.name[0].toUpperCase() : 'B'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user?.name || 'Owner'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Role: {user?.role?.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <Button variant="danger" onClick={logout} style={{ flex: 1, minHeight: '38px', fontSize: '0.8rem' }}>Logout Account</Button>
            {user?.role === 'owner' && (
              <Button variant="primary" onClick={() => setActiveTab('users')} style={{ flex: 1, minHeight: '38px', fontSize: '0.8rem' }}>Manage Users</Button>
            )}
            {user?.role === 'manager' && (
              <Button variant="primary" onClick={() => setActiveTab('payments')} style={{ flex: 1, minHeight: '38px', fontSize: '0.8rem' }}>Go to Payments</Button>
            )}
          </div>
        </Card>

        {/* Change Password Group */}
        <Card style={{ padding: '0.75rem' }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.25rem' }}
            onClick={() => setActiveGroup(activeGroup === 'security' ? '' : 'security')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Security & Password</span>
            </div>
            <span>{activeGroup === 'security' ? '▲' : '▼'}</span>
          </div>

          {activeGroup === 'security' && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--md-sys-color-surface-variant)', paddingTop: '0.75rem' }}>
              {passError && <div className="error-alert">{passError}</div>}
              {passSuccess && <div className="success-alert">{passSuccess}</div>}
              <form onSubmit={handlePasswordChange}>
                <Input
                  label="Old Password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" style={{ width: '100%', minHeight: '44px' }} disabled={passLoading}>
                  {passLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </div>
          )}
        </Card>

        {/* Backup restore Group */}
        {user?.role === 'owner' && (
          <Card style={{ padding: '0.75rem' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.25rem' }}
              onClick={() => setActiveGroup(activeGroup === 'backup' ? '' : 'backup')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Backup & Restore</span>
              </div>
              <span>{activeGroup === 'backup' ? '▲' : '▼'}</span>
            </div>

            {activeGroup === 'backup' && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--md-sys-color-surface-variant)', paddingTop: '0.75rem' }}>
                {backupError && <div className="error-alert">{backupError}</div>}
                {backupSuccess && <div className="success-alert">{backupSuccess}</div>}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="input-md3-label">Database Export</label>
                  <Button
                    variant="outlined"
                    style={{ width: '100%', minHeight: '44px' }}
                    onClick={handleBackupDownload}
                    disabled={backupLoading}
                  >
                    {backupLoading ? 'Exporting...' : 'Download JSON Backup'}
                  </Button>
                </div>

                <div style={{ borderTop: '1px dashed var(--md-sys-color-outline)', paddingTop: '0.75rem' }}>
                  <label className="input-md3-label">Database Restore (Wipes Data)*</label>
                  <form onSubmit={handleRestoreUpload}>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      required
                      style={{ fontSize: '0.75rem', marginBottom: '0.75rem', width: '100%' }}
                    />
                    <Button
                      type="submit"
                      variant="danger"
                      style={{ width: '100%', minHeight: '44px' }}
                      disabled={backupLoading || !restoreFile}
                    >
                      {backupLoading ? 'Restoring...' : 'Upload & Restore Backup'}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Audit Logs Group */}
        {user?.role === 'owner' && (
          <Card style={{ padding: '0.75rem' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.25rem' }}
              onClick={() => {
                setActiveGroup(activeGroup === 'logs' ? '' : 'logs');
                loadLogs();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Audit Trails</span>
              </div>
              <span>{activeGroup === 'logs' ? '▲' : '▼'}</span>
            </div>

            {activeGroup === 'logs' && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--md-sys-color-surface-variant)', paddingTop: '0.75rem' }}>
                <Input
                  label="Search logs"
                  type="text"
                  placeholder="Search user, action, target..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
                
                <div style={{ marginBottom: '1rem' }}>
                  <label className="input-md3-label">Action Filter</label>
                  <select className="input-md3-control" value={logAction} onChange={(e) => setLogAction(e.target.value)}>
                    <option value="">All Actions</option>
                    <option value="USER_LOGIN">User Login</option>
                    <option value="SUPPLIER_ADD">Supplier Add</option>
                    <option value="SUPPLIER_EDIT">Supplier Edit</option>
                    <option value="SUPPLIER_DELETE">Supplier Delete</option>
                    <option value="MILK_ENTRY_ADD">Milk Entry Add</option>
                    <option value="MILK_ENTRY_DELETE">Milk Entry Delete</option>
                    <option value="PAYMENT_RECORD">Payment Record</option>
                    <option value="DATABASE_RESTORE">DB Restore</option>
                  </select>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {logsLoading ? (
                    <Loading label="Searching audit trails..." />
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <div key={log._id} style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--md-sys-color-surface-variant)',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                          <span>{log.user}</span>
                          <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.75rem' }}>
                            {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour12: false })}
                          </span>
                        </div>
                        <div style={{ margin: '0.15rem 0' }}>
                          <Badge type={log.action.includes('DELETE') ? 'error' : log.action.includes('ADD') ? 'success' : 'neutral'} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                            {log.action}
                          </Badge>
                        </div>
                        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.75rem' }}>{log.target}</div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="No audit logs matched search criteria" />
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Desktop Grid Layout Settings View */}
      <div className="grid grid-cols-3 desktop-only" style={{ gap: '1rem', alignItems: 'start' }}>
        
        {/* Settings forms on left side */}
        <div style={{ gridColumn: 'span 1' }} className="grid" style={{ gap: '1rem' }}>
          
          {/* Security */}
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--md-sys-color-surface-variant)', paddingBottom: '0.5rem' }}>
              Change Password
            </h3>
            {passError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{passError}</div>}
            {passSuccess && <div className="success-alert" style={{ marginBottom: '1rem' }}>{passSuccess}</div>}

            <form onSubmit={handlePasswordChange}>
              <Input
                label="Old Password"
                type="password"
                placeholder="Verify old password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={passLoading}>
                {passLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </Card>

          {/* Backup Restore */}
          {user?.role === 'owner' && (
            <Card>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--md-sys-color-surface-variant)', paddingBottom: '0.5rem' }}>
                Backup & Restore System
              </h3>
              {backupError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{backupError}</div>}
              {backupSuccess && <div className="success-alert" style={{ marginBottom: '1rem' }}>{backupSuccess}</div>}

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-md3-label">Export Database State</label>
                <Button
                  variant="outlined"
                  style={{ width: '100%' }}
                  onClick={handleBackupDownload}
                  disabled={backupLoading}
                >
                  {backupLoading ? 'Exporting...' : 'Download JSON Backup'}
                </Button>
              </div>

              <div style={{ borderTop: '1px solid var(--md-sys-color-surface-variant)', paddingTop: '1rem' }}>
                <label className="input-md3-label">Restore Database State*</label>
                <form onSubmit={handleRestoreUpload}>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    required
                    style={{ fontSize: '0.75rem', marginBottom: '0.75rem', width: '100%' }}
                  />
                  <Button
                    type="submit"
                    variant="danger"
                    style={{ width: '100%' }}
                    disabled={backupLoading || !restoreFile}
                  >
                    {backupLoading ? 'Restoring...' : 'Restore Backup File'}
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>

        {/* Audit Trail Logs on right side (Desktop) */}
        {user?.role === 'owner' && (
          <div style={{ gridColumn: 'span 2' }}>
            <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '0.75rem' }}>Audit Trail Logs</h3>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <Input
                  label="Search Logs"
                  type="text"
                  placeholder="Search user, action, target..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
                <div>
                  <label className="input-md3-label">Filter Action Type</label>
                  <select className="input-md3-control" value={logAction} onChange={(e) => setLogAction(e.target.value)}>
                    <option value="">All Actions</option>
                    <option value="USER_LOGIN">User Login</option>
                    <option value="SUPPLIER_ADD">Supplier Add</option>
                    <option value="SUPPLIER_EDIT">Supplier Edit</option>
                    <option value="SUPPLIER_DELETE">Supplier Delete</option>
                    <option value="MILK_ENTRY_ADD">Milk Entry Add</option>
                    <option value="MILK_ENTRY_DELETE">Milk Entry Delete</option>
                    <option value="PAYMENT_RECORD">Payment Record</option>
                    <option value="DATABASE_RESTORE">DB Restore</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card style={{ padding: '0.5rem' }}>
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {logsLoading ? (
                  <Loading label="Searching audit trails..." />
                ) : (
                  <table className="table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, backgroundColor: 'var(--md-sys-color-surface)', zIndex: 1 }}>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.map((log) => (
                          <tr key={log._id}>
                            <td style={{ color: 'var(--md-sys-color-on-surface-variant)', width: '130px' }}>
                              {new Date(log.timestamp).toLocaleString('en-IN', { hour12: false })}
                            </td>
                            <td style={{ fontWeight: '500' }}>{log.user}</td>
                            <td>
                              <Badge type={log.action.includes('DELETE') ? 'error' : log.action.includes('ADD') ? 'success' : 'neutral'}>
                                {log.action}
                              </Badge>
                            </td>
                            <td>{log.target}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                            No audit log entries matched search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

    </div>
  );
};

export default Settings;
