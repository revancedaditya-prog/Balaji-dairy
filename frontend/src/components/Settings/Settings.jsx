import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  ShieldCheck,
  Download,
  Upload,
  Save,
  KeyRound,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import { settingService, authService, backupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../Common/Toast';
import { PageHeader, Modal, ConfirmationDialog } from '../Common/UIComponents';

const Settings = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState({
    dairyName: 'BALAJI DAIRY',
    dairyHindiName: 'श्री बालाजी डेयरी',
    tagline: 'Fresh Milk & Dairy Products',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    fssaiNumber: '',
    gstNumber: '',
    billFooterNotes: 'Thank you for your business! Please settle pending balance by due date.',
    morningShiftStart: '05:00',
    eveningShiftStart: '16:00',
    varianceToleranceLiters: 5,
    defaultCowRate: 45,
    defaultBuffaloRate: 65,
    currencySymbol: '₹',
  });

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Backup / Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingService.getSettings();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      const res = await settingService.updateSettings(settings);
      if (res.success) {
        showSuccess('Dairy settings saved successfully! / सेटिंग्स सफलतापूर्वक सहेजी गईं');
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showWarning('New password and confirmation password do not match');
      return;
    }
    if (newPassword.length < 6) {
      showWarning('New password must be at least 6 characters long');
      return;
    }

    try {
      setPassLoading(true);
      const res = await authService.changePassword(oldPassword, newPassword);
      if (res.success) {
        showSuccess('Password updated successfully! / पासवर्ड बदल दिया गया है');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleBackupDownload = async () => {
    try {
      setBackupLoading(true);
      const blob = await backupService.triggerExport();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `balaji_dairy_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showSuccess('System backup JSON downloaded successfully! / बैकअप डाउनलोड हो गया');
    } catch (err) {
      console.error(err);
      showError('Failed to export system database backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setRestoreFile(e.target.files[0] || null);
  };

  const handleConfirmRestore = async () => {
    if (!restoreFile) {
      showWarning('Please select a JSON backup file first');
      return;
    }

    setBackupLoading(true);
    setShowRestoreConfirm(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupJson = JSON.parse(event.target.result);
        const res = await backupService.restore(backupJson);
        if (res.success) {
          showSuccess(
            `Database restored! Loaded ${res.stats?.suppliers || 0} suppliers, ${res.stats?.milkEntries || 0} milk entries, ${res.stats?.customers || 0} customers.`
          );
          setRestoreFile(null);
        }
      } catch (err) {
        console.error(err);
        showError(err.response?.data?.message || 'Invalid backup JSON file or restore failed.');
      } finally {
        setBackupLoading(false);
      }
    };
    reader.readAsText(restoreFile);
  };

  return (
    <div className="settings-page">
      <PageHeader
        title="Dairy Settings & Configuration"
        subtitle="डेयरी सेटिंग्स, बिलिंग प्रोफ़ाइल और सिस्टम बैकअप"
        icon={Building2}
      />

      {/* Tabs Bar */}
      <div className="filter-card" style={{ marginBottom: '1.25rem', padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Building2 size={16} /> Dairy Profile (डेयरी प्रोफ़ाइल)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'operations' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('operations')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Clock size={16} /> Operations & Shifts (शिफ्ट व दरें)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('security')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ShieldCheck size={16} /> Security & Password (पासवर्ड)
          </button>
          {user?.role === 'owner' && (
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'backup' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('backup')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={16} /> Backup & Restore (डेटा बैकअप)
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DAIRY PROFILE */}
      {activeTab === 'profile' && (
        <div className="dairy-card" style={{ maxWidth: '900px' }}>
          <div className="dairy-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="var(--dairy-gold)" />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Business Profile & Legal Details</span>
          </div>

          <form onSubmit={handleSaveSettings} className="dairy-card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">Dairy Brand Name (English)</label>
                <input
                  type="text"
                  name="dairyName"
                  className="form-control"
                  value={settings.dairyName}
                  onChange={handleSettingsChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dairy Hindi Name (हिंदी नाम)</label>
                <input
                  type="text"
                  name="dairyHindiName"
                  className="form-control"
                  value={settings.dairyHindiName}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tagline / Slogan</label>
                <input
                  type="text"
                  name="tagline"
                  className="form-control"
                  value={settings.tagline}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Proprietor / Owner Name</label>
                <input
                  type="text"
                  name="ownerName"
                  className="form-control"
                  value={settings.ownerName}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Phone / Mobile</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  value={settings.phone}
                  onChange={handleSettingsChange}
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={settings.email}
                  onChange={handleSettingsChange}
                  placeholder="e.g. balajidairy@gmail.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">FSSAI License Number</label>
                <input
                  type="text"
                  name="fssaiNumber"
                  className="form-control"
                  value={settings.fssaiNumber}
                  onChange={handleSettingsChange}
                  placeholder="14-digit FSSAI number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Tax ID</label>
                <input
                  type="text"
                  name="gstNumber"
                  className="form-control"
                  value={settings.gstNumber}
                  onChange={handleSettingsChange}
                  placeholder="15-digit GST Number"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Complete Dairy Address / Location</label>
              <textarea
                name="address"
                className="form-control"
                rows="2"
                value={settings.address}
                onChange={handleSettingsChange}
                placeholder="Village/Town, Tehsil, District, State, PIN"
              ></textarea>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Customer Bill Statement Footer Notes (बिल फ़ुटर नोट)</label>
              <textarea
                name="billFooterNotes"
                className="form-control"
                rows="2"
                value={settings.billFooterNotes}
                onChange={handleSettingsChange}
                placeholder="Message displayed at bottom of printed bills & WhatsApp statements"
              ></textarea>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saveLoading}>
                <Save size={16} /> {saveLoading ? 'Saving Profile...' : 'Save Dairy Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: OPERATIONS & SHIFTS */}
      {activeTab === 'operations' && (
        <div className="dairy-card" style={{ maxWidth: '900px' }}>
          <div className="dairy-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--dairy-gold)" />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Shift Timings & Variance Thresholds</span>
          </div>

          <form onSubmit={handleSaveSettings} className="dairy-card-body">
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">Morning Shift Start Time (सुबह शिफ्ट)</label>
                <input
                  type="time"
                  name="morningShiftStart"
                  className="form-control"
                  value={settings.morningShiftStart}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Evening Shift Start Time (शाम शिफ्ट)</label>
                <input
                  type="time"
                  name="eveningShiftStart"
                  className="form-control"
                  value={settings.eveningShiftStart}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reconciliation Variance Tolerance (Liters)</label>
                <input
                  type="number"
                  step="0.5"
                  name="varianceToleranceLiters"
                  className="form-control"
                  value={settings.varianceToleranceLiters}
                  onChange={handleSettingsChange}
                  placeholder="e.g. 5"
                />
                <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  If daily milk variance exceeds this limit, an alert will be triggered.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Default Cow Milk Sale Rate (₹/L)</label>
                <input
                  type="number"
                  step="1"
                  name="defaultCowRate"
                  className="form-control"
                  value={settings.defaultCowRate}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Buffalo Milk Sale Rate (₹/L)</label>
                <input
                  type="number"
                  step="1"
                  name="defaultBuffaloRate"
                  className="form-control"
                  value={settings.defaultBuffaloRate}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input
                  type="text"
                  name="currencySymbol"
                  className="form-control"
                  value={settings.currencySymbol}
                  onChange={handleSettingsChange}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saveLoading}>
                <Save size={16} /> {saveLoading ? 'Saving Parameters...' : 'Save Operations Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="dairy-card" style={{ maxWidth: '650px' }}>
          <div className="dairy-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="var(--dairy-gold)" />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Change Account Password</span>
          </div>

          <form onSubmit={handlePasswordChange} className="dairy-card-body">
            <div className="form-group">
              <label className="form-label">Current / Old Password</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">New Password (नया पासवर्ड)</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Confirm New Password (पासवर्ड दोबारा लिखें)</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={passLoading}>
                <KeyRound size={16} /> {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && user?.role === 'owner' && (
        <div className="dairy-card" style={{ maxWidth: '800px' }}>
          <div className="dairy-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={20} color="var(--dairy-gold)" />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Database Backup & Emergency Restore</span>
          </div>

          <div className="dairy-card-body">
            {/* Export Section */}
            <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Export Full Database Snapshot</h4>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Download a JSON archive containing all Suppliers, Milk Collections, Customers, Daily Deliveries, Customer Payments, Supplier Payments, and Settings.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBackupDownload}
                disabled={backupLoading}
              >
                <Download size={16} /> {backupLoading ? 'Generating Export...' : 'Download Complete JSON Backup'}
              </button>
            </div>

            {/* Restore Section */}
            <div style={{ paddingTop: '1.5rem' }}>
              <h4 style={{ fontWeight: '700', color: 'var(--loss-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} /> Database Restore (Wipe & Replace)
              </h4>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Restore business records from a previously downloaded Balaji Dairy JSON backup file.
                <strong style={{ color: 'var(--loss-red)' }}> Note: This replaces all operational tables.</strong>
              </p>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{
                    padding: '0.5rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={!restoreFile || backupLoading}
                  onClick={() => setShowRestoreConfirm(true)}
                >
                  <Upload size={16} /> Restore from File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Restore */}
      <ConfirmationDialog
        isOpen={showRestoreConfirm}
        title="Confirm Database Restore"
        message="Are you sure you want to restore the database from this JSON backup? Current records will be replaced with the backup file data."
        confirmText="Yes, Restore Database"
        confirmVariant="danger"
        onConfirm={handleConfirmRestore}
        onCancel={() => setShowRestoreConfirm(false)}
      />
    </div>
  );
};

export default Settings;
