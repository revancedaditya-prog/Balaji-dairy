import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Droplets
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { qualityService, supplierService } from '../../services/api';
import { PageHeader, SearchInput, Modal, ConfirmationDialog, StatusBadge } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';

const QualityTests = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Modal
  const [showModal, setShowModal] = useState(false);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [formData, setFormData] = useState({
    date: getISTDate(),
    shift: 'Morning',
    fat: '',
    snf: '',
    clr: '',
    temperature: '',
    acidity: '',
    waterAdulteration: '0',
    neutralizer: 'Negative',
    urea: 'Negative',
    starch: 'Negative',
    detergent: 'Negative',
    remarks: '',
  });

  const [deleteId, setDeleteId] = useState(null);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await qualityService.getQualityTests();
      if (res.success) {
        setTests(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch milk quality test records');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Lookup supplier when code changes
  useEffect(() => {
    const codeNum = parseInt(supplierCode, 10);
    if (!codeNum || isNaN(codeNum)) {
      setSupplierName('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await supplierService.getSupplierByCode(codeNum);
        if (res.success && res.data) {
          setSupplierName(res.data.supplierName);
        } else {
          setSupplierName('');
        }
      } catch {
        setSupplierName('');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [supplierCode]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const codeNum = parseInt(supplierCode, 10);
    if (!codeNum) {
      showWarning('Please enter a valid Supplier Code');
      return;
    }

    try {
      const res = await qualityService.addQualityTest({
        ...formData,
        supplierCode: codeNum,
        supplierName: supplierName || `Farmer #${codeNum}`,
      });
      if (res.success) {
        showSuccess(`Logged quality test for #${codeNum} ${supplierName || ''} - Status: ${res.data?.status}`);
        setShowModal(false);
        setSupplierCode('');
        setSupplierName('');
        setFormData({
          date: getISTDate(),
          shift: 'Morning',
          fat: '',
          snf: '',
          clr: '',
          temperature: '',
          acidity: '',
          waterAdulteration: '0',
          neutralizer: 'Negative',
          urea: 'Negative',
          starch: 'Negative',
          detergent: 'Negative',
          remarks: '',
        });
        fetchTests();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save quality test');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await qualityService.deleteQualityTest(deleteId);
      if (res.success) {
        showSuccess('Test record deleted');
        setDeleteId(null);
        fetchTests();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete test');
    }
  };

  const filteredTests = tests.filter((t) => {
    return (
      !searchTerm ||
      String(t.supplierCode).includes(searchTerm) ||
      t.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExportExcel = () => {
    if (filteredTests.length === 0) return;
    const data = filteredTests.map((t) => ({
      Date: t.date,
      Shift: t.shift,
      'Supplier Code': t.supplierCode,
      'Supplier Name': t.supplierName,
      'Fat %': t.fat,
      'SNF %': t.snf,
      'CLR / Lactometer': t.clr,
      'Water Adulteration %': t.waterAdulteration,
      Neutralizer: t.neutralizer,
      Urea: t.urea,
      Starch: t.starch,
      Detergent: t.detergent,
      Status: t.status,
      Remarks: t.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quality_Tests');
    XLSX.writeFile(wb, `Balaji_Quality_Tests_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported quality tests to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Milk Quality & Adulteration Testing"
        hindiTitle="दूध गुणवत्ता व मिलावट जांच"
        subtitle="Log CLR / Lactometer readings, chemical adulteration (Urea, Starch, Detergent, Neutralizer), and purity indices."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Log Quality Test</span>
            </button>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Tests Logged</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
            {tests.length}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>All Batches Tested</div>
        </div>

        <div className="card" style={{ background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E' }}>Adulteration Warnings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {tests.filter(t => t.status === 'Warning' || t.status === 'Rejected').length}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#B45309' }}>Non-Compliant Samples</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by supplier code, farmer name, or test result status..."
        />
      </div>

      {/* Quality Tests Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Fat %</th>
                <th>SNF %</th>
                <th>CLR</th>
                <th>Water Added</th>
                <th>Neutralizer</th>
                <th>Urea</th>
                <th>Starch / Detergent</th>
                <th>Result Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.length > 0 ? (
                filteredTests.map((t) => (
                  <tr key={t._id}>
                    <td style={{ fontSize: '0.825rem' }}>{t.date} ({t.shift})</td>
                    <td>
                      <span className="badge badge-gold font-mono-num">#{t.supplierCode}</span>
                      <strong style={{ marginLeft: '4px', color: 'var(--color-primary)' }}>{t.supplierName}</strong>
                    </td>
                    <td className="font-mono-num">{t.fat}%</td>
                    <td className="font-mono-num">{t.snf}%</td>
                    <td className="font-mono-num">{t.clr || '—'}</td>
                    <td className="font-mono-num" style={{ color: t.waterAdulteration > 5 ? 'var(--color-danger-text)' : 'inherit', fontWeight: t.waterAdulteration > 5 ? 700 : 400 }}>
                      {t.waterAdulteration > 0 ? `${t.waterAdulteration}%` : 'None'}
                    </td>
                    <td>
                      <span className={`badge ${t.neutralizer === 'Positive' ? 'badge-danger' : 'badge-success'}`}>
                        {t.neutralizer}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.urea === 'Positive' ? 'badge-danger' : 'badge-success'}`}>
                        {t.urea}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.starch === 'Positive' || t.detergent === 'Positive' ? 'badge-danger' : 'badge-success'}`}>
                        {t.starch === 'Positive' ? 'Starch (+)' : t.detergent === 'Positive' ? 'Detergent (+)' : 'Negative'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteId(t._id)}
                        className="btn-icon-sm btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete Test"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No quality test records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Milk Quality & Purity Test"
        size="lg"
      >
        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Farmer / Supplier Code <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                className="form-control font-mono-num"
                placeholder="e.g. 101"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                required
                autoFocus
              />
              {supplierName && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> {supplierName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Test Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shift</label>
              <select
                className="form-control"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">FAT %</label>
              <input
                type="number"
                step="0.1"
                className="form-control font-mono-num"
                placeholder="e.g. 6.5"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SNF %</label>
              <input
                type="number"
                step="0.1"
                className="form-control font-mono-num"
                placeholder="e.g. 9.0"
                value={formData.snf}
                onChange={(e) => setFormData({ ...formData, snf: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CLR / Lactometer</label>
              <input
                type="number"
                step="0.5"
                className="form-control font-mono-num"
                placeholder="e.g. 28.5"
                value={formData.clr}
                onChange={(e) => setFormData({ ...formData, clr: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Added Water Result (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="form-control font-mono-num"
                placeholder="0"
                value={formData.waterAdulteration}
                onChange={(e) => setFormData({ ...formData, waterAdulteration: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Neutralizer Check</label>
              <select
                className="form-control"
                value={formData.neutralizer}
                onChange={(e) => setFormData({ ...formData, neutralizer: e.target.value })}
              >
                <option value="Negative">Negative (शुद्ध)</option>
                <option value="Positive">Positive (मिलावटयुक्त)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urea Test</label>
              <select
                className="form-control"
                value={formData.urea}
                onChange={(e) => setFormData({ ...formData, urea: e.target.value })}
              >
                <option value="Negative">Negative (शुद्ध)</option>
                <option value="Positive">Positive (यूरिया मिलावट)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Starch Test</label>
              <select
                className="form-control"
                value={formData.starch}
                onChange={(e) => setFormData({ ...formData, starch: e.target.value })}
              >
                <option value="Negative">Negative (शुद्ध)</option>
                <option value="Positive">Positive (स्टार्च मिलावट)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Detergent Test</label>
              <select
                className="form-control"
                value={formData.detergent}
                onChange={(e) => setFormData({ ...formData, detergent: e.target.value })}
              >
                <option value="Negative">Negative (शुद्ध)</option>
                <option value="Positive">Positive (डिटर्जेंट मिलावट)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Test Remarks / Laboratory Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Temperature 4°C, Acidity normal"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
              Save Quality Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Quality Test Record"
        message="Are you sure you want to delete this milk quality test entry?"
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
};

export default QualityTests;
