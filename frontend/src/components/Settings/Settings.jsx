import React, { useState, useEffect } from 'react';
import { authService, backupService, auditService } from '../../services/api';

const Settings = () => {
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
    <div className="settings-view">
      <div className="view-header">
        <div>
          <h1>Settings & Audit Logs</h1>
          <p className="text-muted">Configure profile security, export system backups, and review audit trails</p>
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Configurations left side */}
        <div style={{ gridColumn: 'span 1' }} className="grid" style={{ gap: '1rem' }}>
          {/* Security */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Change Password
            </h3>
            {passError && <div className="error-alert" style={{ marginBottom: '1.5rem' }}>{passError}</div>}
            {passSuccess && <div className="success-alert" style={{ marginBottom: '1.5rem' }}>{passSuccess}</div>}

            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Old Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Verify old password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
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
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={passLoading}>
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Backup restore */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Backup & Restore System
            </h3>
            {backupError && <div className="error-alert" style={{ marginBottom: '1.5rem' }}>{backupError}</div>}
            {backupSuccess && <div className="success-alert" style={{ marginBottom: '1.5rem' }}>{backupSuccess}</div>}

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Export Database State</label>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleBackupDownload}
                disabled={backupLoading}
              >
                {backupLoading ? 'Exporting...' : 'Download JSON Backup'}
              </button>
              <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem' }}>
                Generates a JSON dump of all DB entries (farmers, milk collections, rates, payments).
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label className="form-label">Restore Database State</label>
              <form onSubmit={handleRestoreUpload}>
                <div className="form-group">
                  <input
                    type="file"
                    accept=".json"
                    className="form-control"
                    onChange={handleFileChange}
                    required
                    style={{ fontSize: '0.75rem' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-danger btn-block"
                  disabled={backupLoading || !restoreFile}
                >
                  {backupLoading ? 'Restoring...' : 'Restore Backup File'}
                </button>
              </form>
              <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.25rem', color: 'var(--danger)' }}>
                Warning: Restoring will overwrite the current database tables.
              </span>
            </div>
          </div>
        </div>

        {/* Audit logs trail right side */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Audit Trail Logs</h3>
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label className="form-label">Search Logs</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search user, action, target..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Filter Action Type</label>
                <select className="form-control" value={logAction} onChange={(e) => setLogAction(e.target.value)}>
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
          </div>

          <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {logsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Searching audit trails...</span>
              </div>
            ) : (
              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 1 }}>
                    <th>Timestamp</th>
                    <th>User Profile</th>
                    <th>Action Executed</th>
                    <th>Target Object</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ color: 'var(--text-light)', width: '130px' }}>
                          {new Date(log.timestamp).toLocaleString('en-IN', { hour12: false })}
                        </td>
                        <td style={{ fontWeight: '500' }}>{log.user}</td>
                        <td>
                          <span className={`badge ${
                            log.action.includes('DELETE') || log.action.includes('CLEAR')
                              ? 'badge-inactive'
                              : log.action.includes('ADD') || log.action.includes('RECORD')
                              ? 'badge-active'
                              : 'badge-morning'
                          }`} style={{ fontSize: '0.65rem' }}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.target}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        No audit log entries matched search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
