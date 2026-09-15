import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Plus,
  Calendar,
  Download,
  Trash2,
  Scale,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { internalUseService } from '../../services/api';
import { PageHeader, Modal, ConfirmationDialog } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const InternalMilkUse = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getISTDate());
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [totalMilk, setTotalMilk] = useState(0);

  // Add Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: getISTDate(),
    shift: 'Morning',
    purpose: 'Paneer',
    quantity: '',
    fat: '',
    productOutputQty: '',
    productOutputUnit: 'kg',
    notes: '',
  });

  const [deleteId, setDeleteId] = useState(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await internalUseService.getInternalUse({ date });
      if (res.success) {
        setEntries(res.data);
        setTotalMilk(res.totalMilk || 0);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch internal milk usage');
    } finally {
      setLoading(false);
    }
  }, [date, showError]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(formData.quantity);
    if (!qty || qty <= 0) {
      showWarning('Please enter a valid quantity in liters');
      return;
    }

    try {
      const res = await internalUseService.addInternalUse({
        ...formData,
        quantity: qty,
        fat: parseFloat(formData.fat) || 0,
        productOutputQty: parseFloat(formData.productOutputQty) || 0,
      });

      if (res.success) {
        showSuccess(`Logged ${qty}L for ${formData.purpose}`);
        setShowModal(false);
        setFormData({
          date: getISTDate(),
          shift: 'Morning',
          purpose: 'Paneer',
          quantity: '',
          fat: '',
          productOutputQty: '',
          productOutputUnit: 'kg',
          notes: '',
        });
        fetchEntries();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to log internal milk usage');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await internalUseService.deleteInternalUse(deleteId);
      if (res.success) {
        showSuccess('Entry deleted successfully');
        setDeleteId(null);
        fetchEntries();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete record');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Internal Milk Use & Processing"
        hindiTitle="पनीर / खोया / चाय दूध"
        subtitle="Track milk diverted for Paneer, Khoya, Kulfi, staff tea, samples, and wastage."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <Calendar size={16} color="var(--color-text-muted)" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}
              />
            </div>

            <button onClick={() => setShowModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Log Milk Use</span>
            </button>
          </div>
        }
      />

      {/* KPI Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Internal Milk Logged</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7E22CE', marginTop: '0.2rem' }} className="font-mono-num">
            {totalMilk} L
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>{entries.length} Processing Entries on {date}</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Purpose / Product</th>
                <th>Quantity (L)</th>
                <th>Fat %</th>
                <th>Product Output Yield</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length > 0 ? (
                entries.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontSize: '0.825rem' }}>{item.date}</td>
                    <td>{item.shift}</td>
                    <td>
                      <span className="badge badge-gold" style={{ fontWeight: 700 }}>
                        {item.purpose}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                      {item.quantity} L
                    </td>
                    <td className="font-mono-num">{item.fat > 0 ? `${item.fat}%` : '—'}</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">
                      {item.productOutputQty > 0 ? `${item.productOutputQty} ${item.productOutputUnit}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                      {item.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteId(item._id)}
                        className="btn-icon-sm btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No internal milk use logged for {date}. Click "+ Log Milk Use" to record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Internal Milk Use / Processing"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Purpose / Category <span className="required">*</span></label>
            <select
              className="form-control"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
            >
              <option value="Paneer">Paneer Production (पनीर)</option>
              <option value="Khoya">Khoya / Mawa (खोया / मावा)</option>
              <option value="Kulfi">Kulfi Making (कुल्फी)</option>
              <option value="Tea / Staff">Staff Tea / Refreshments (स्टाफ चाय)</option>
              <option value="Samples">Testing & Quality Samples (सैंपल)</option>
              <option value="Wastage">Wastage / Curdled / Spilled (वेस्टेज / खराबी)</option>
              <option value="Other">Other Use</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity (Liters) <span className="required">*</span></label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                className="form-control font-mono-num"
                style={{ fontSize: '1.15rem', fontWeight: 800 }}
                placeholder="Liters"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fat % (Optional)</label>
              <input
                type="number"
                step="0.1"
                className="form-control font-mono-num"
                placeholder="e.g. 6.5"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Product Output Yield (Optional)</label>
              <input
                type="number"
                step="0.1"
                className="form-control font-mono-num"
                placeholder="e.g. 4.2"
                value={formData.productOutputQty}
                onChange={(e) => setFormData({ ...formData, productOutputQty: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Unit</label>
              <select
                className="form-control"
                value={formData.productOutputUnit}
                onChange={(e) => setFormData({ ...formData, productOutputUnit: e.target.value })}
              >
                <option value="kg">kg</option>
                <option value="gm">gm</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Batch #1 paneer made from evening collection"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Internal Milk Record"
        message="Are you sure you want to delete this internal milk use record?"
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
};

export default InternalMilkUse;
