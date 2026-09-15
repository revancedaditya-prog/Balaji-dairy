import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Milk,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  Sun,
  Moon,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { milkEntryService, supplierService, rateChartService } from '../../services/api';
import { PageHeader, Currency, Quantity, ConfirmationDialog } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';

const MilkCollection = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [mode, setMode] = useState('quick'); // 'quick' | 'advanced'
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ totalMilk: 0, totalAmount: 0, count: 0, avgFat: 0, avgSnf: 0 });

  // Current Shift & Date
  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const getAutoShift = () => {
    const hour = new Date().getHours();
    return hour >= 4 && hour < 14 ? 'Morning' : 'Evening';
  };

  const [filterDate, setFilterDate] = useState(getISTDate());
  const [filterShift, setFilterShift] = useState(getAutoShift());

  // Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierVillage, setSupplierVillage] = useState('');
  const [milkQuantity, setMilkQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [rate, setRate] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [entryDate, setEntryDate] = useState(getISTDate());
  const [entryShift, setEntryShift] = useState(getAutoShift());

  // Delete Dialog
  const [deleteId, setDeleteId] = useState(null);

  // Print Slip
  const [printSlipData, setPrintSlipData] = useState(null);

  // Input Refs for keyboard navigation
  const codeInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const fatInputRef = useRef(null);
  const snfInputRef = useRef(null);

  // Fetch entries for the selected date & shift
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await milkEntryService.getEntries({
        date: filterDate,
        shift: filterShift,
      });
      if (res.success) {
        setEntries(res.data);

        // Compute summary
        const totalMilk = Math.round(res.data.reduce((sum, e) => sum + e.milkQuantity, 0) * 100) / 100;
        const totalAmount = Math.round(res.data.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
        const fatSum = res.data.reduce((sum, e) => sum + e.fat * e.milkQuantity, 0);
        const snfSum = res.data.reduce((sum, e) => sum + e.snf * e.milkQuantity, 0);
        const avgFat = totalMilk > 0 ? Math.round((fatSum / totalMilk) * 100) / 100 : 0;
        const avgSnf = totalMilk > 0 ? Math.round((snfSum / totalMilk) * 100) / 100 : 0;

        setTodaySummary({
          totalMilk,
          totalAmount,
          count: res.data.length,
          avgFat,
          avgSnf,
        });
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch milk collection records');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterShift, showError]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Lookup Supplier details when code changes
  useEffect(() => {
    const codeNum = parseInt(supplierCode, 10);
    if (!codeNum || isNaN(codeNum)) {
      setSupplierName('');
      setSupplierVillage('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await supplierService.getSupplierByCode(codeNum);
        if (res.success && res.data) {
          setSupplierName(res.data.supplierName);
          setSupplierVillage(res.data.village || '');
        } else {
          setSupplierName('');
          setSupplierVillage('');
        }
      } catch {
        setSupplierName('');
        setSupplierVillage('');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [supplierCode]);

  // Lookup Rate when Fat & SNF change
  useEffect(() => {
    const fatNum = parseFloat(fat);
    const snfNum = parseFloat(snf);

    if (fatNum > 0 && snfNum > 0) {
      const timer = setTimeout(async () => {
        try {
          const res = await rateChartService.lookupRate(fatNum, snfNum);
          if (res.success && res.rate > 0) {
            setRate(res.rate);
            const qtyNum = parseFloat(milkQuantity);
            if (qtyNum > 0) {
              setAmount(Math.round(qtyNum * res.rate * 100) / 100);
            }
          } else {
            // Fallback formula if not in grid: rate = fat * 7.2 + snf * 3.5
            const calculatedRate = Math.round((fatNum * 7.2 + snfNum * 3.5) * 10) / 10;
            setRate(calculatedRate);
            const qtyNum = parseFloat(milkQuantity);
            if (qtyNum > 0) {
              setAmount(Math.round(qtyNum * calculatedRate * 100) / 100);
            }
          }
        } catch {
          const calculatedRate = Math.round((fatNum * 7.2 + snfNum * 3.5) * 10) / 10;
          setRate(calculatedRate);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [fat, snf, milkQuantity]);

  // Recalculate amount when quantity or rate changes
  useEffect(() => {
    const q = parseFloat(milkQuantity);
    const r = parseFloat(rate);
    if (q > 0 && r > 0) {
      setAmount(Math.round(q * r * 100) / 100);
    }
  }, [milkQuantity, rate]);

  const handleSaveEntry = async (e) => {
    if (e) e.preventDefault();

    const codeNum = parseInt(supplierCode, 10);
    const qtyNum = parseFloat(milkQuantity);
    const fatNum = parseFloat(fat) || 0;
    const snfNum = parseFloat(snf) || 0;
    const rateNum = parseFloat(rate) || 0;
    const amountNum = parseFloat(amount) || Math.round(qtyNum * rateNum * 100) / 100;

    if (!codeNum) {
      showWarning('Please enter a valid Supplier Code');
      codeInputRef.current?.focus();
      return;
    }
    if (!qtyNum || qtyNum <= 0) {
      showWarning('Please enter a valid milk quantity in liters');
      qtyInputRef.current?.focus();
      return;
    }
    if (amountNum <= 0) {
      showWarning('Amount must be greater than zero. Check rate or quantity.');
      return;
    }

    try {
      const payload = {
        supplierCode: codeNum,
        supplierName: supplierName || `Farmer #${codeNum}`,
        date: mode === 'quick' ? filterDate : entryDate,
        shift: mode === 'quick' ? filterShift : entryShift,
        milkQuantity: qtyNum,
        fat: fatNum,
        snf: snfNum,
        rate: rateNum,
        amount: amountNum,
        remarks: remarks || '',
      };

      const res = await milkEntryService.addEntry(payload);
      if (res.success) {
        showSuccess(`Saved: #${codeNum} ${supplierName || ''} — ${qtyNum}L (₹${amountNum})`);

        // Set print slip data
        setPrintSlipData({
          ...res.data,
          village: supplierVillage,
        });

        // Reset form for next entry & auto-focus code input
        setSupplierCode('');
        setSupplierName('');
        setSupplierVillage('');
        setMilkQuantity('');
        setFat('');
        setSnf('');
        setRate('');
        setAmount('');
        setRemarks('');

        fetchEntries();
        codeInputRef.current?.focus();
      }
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Failed to save milk entry');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await milkEntryService.deleteEntry(deleteId);
      if (res.success) {
        showSuccess('Milk entry deleted successfully');
        setDeleteId(null);
        fetchEntries();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete milk entry');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Shift Selector */}
      <PageHeader
        title="Milk Collection"
        hindiTitle="दूध खरीद व संकलन"
        subtitle="Fast dairy milk entry with automatic rate calculation, Fat × SNF lookup, and instant print slips."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <Calendar size={16} color="var(--color-text-muted)" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setFilterShift('Morning')}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: 'none',
                  backgroundColor: filterShift === 'Morning' ? '#FEF3C7' : 'var(--color-surface)',
                  color: filterShift === 'Morning' ? '#92400E' : 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Sun size={14} /> Morning
              </button>
              <button
                type="button"
                onClick={() => setFilterShift('Evening')}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: 'none',
                  backgroundColor: filterShift === 'Evening' ? '#EDE9FE' : 'var(--color-surface)',
                  color: filterShift === 'Evening' ? '#5B21B6' : 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Moon size={14} /> Evening
              </button>
            </div>
          </div>
        }
      />

      {/* Shift Live Statistics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <div className="card" style={{ padding: '0.85rem 1.15rem', background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Shift Collection</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {todaySummary.totalMilk} L
          </div>
          <div style={{ fontSize: '0.725rem', color: '#B45309' }}>{todaySummary.count} Entries Recorded</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>Total Amount</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{todaySummary.totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>Shift Purchase Cost</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem', background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase' }}>Weighted Avg Fat</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {todaySummary.avgFat} %
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>Quality Index</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1.15rem', background: '#F0F9FF', borderColor: '#BAE6FD' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Weighted Avg SNF</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {todaySummary.avgSnf} %
          </div>
          <div style={{ fontSize: '0.725rem', color: '#0284C7' }}>Solids-not-Fat</div>
        </div>
      </div>

      {/* Milk Entry Form Card */}
      <div className="card" style={{ border: '2px solid var(--color-accent-border)', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #E6CA65 0%, #D4AF37 100%)', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Milk size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {mode === 'quick' ? 'FAST MILK COLLECTION ENTRY' : 'ADVANCED MILK ENTRY'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                {filterDate} • {filterShift} Shift Entry
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMode(mode === 'quick' ? 'advanced' : 'quick')}
              className="btn btn-secondary btn-sm"
            >
              {mode === 'quick' ? 'Switch to Advanced Entry' : 'Switch to Fast Quick Entry'}
            </button>
          </div>
        </div>

        {/* Quick / Advanced Entry Form */}
        <form onSubmit={handleSaveEntry}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Supplier Code */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Farmer Code</span>
                <span className="required">*</span>
              </label>
              <input
                ref={codeInputRef}
                type="number"
                min="1"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700, borderColor: supplierName ? 'var(--color-success)' : 'var(--color-border)' }}
                placeholder="Code (e.g. 101)"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    qtyInputRef.current?.focus();
                  }
                }}
                autoFocus
                required
              />
              {supplierName && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> {supplierName} {supplierVillage ? `(${supplierVillage})` : ''}
                </span>
              )}
            </div>

            {/* Quantity */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Quantity (L)</span>
                <span className="required">*</span>
              </label>
              <input
                ref={qtyInputRef}
                type="number"
                step="0.1"
                min="0.1"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
                placeholder="Liters"
                value={milkQuantity}
                onChange={(e) => setMilkQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fatInputRef.current?.focus();
                  }
                }}
                required
              />
            </div>

            {/* Fat */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Fat %</span>
              </label>
              <input
                ref={fatInputRef}
                type="number"
                step="0.1"
                min="1"
                max="15"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
                placeholder="e.g. 6.5"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    snfInputRef.current?.focus();
                  }
                }}
              />
            </div>

            {/* SNF */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>SNF %</span>
              </label>
              <input
                ref={snfInputRef}
                type="number"
                step="0.1"
                min="1"
                max="15"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
                placeholder="e.g. 9.0"
                value={snf}
                onChange={(e) => setSnf(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEntry();
                  }
                }}
              />
            </div>

            {/* Auto Rate */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Rate (₹/L)</span>
              </label>
              <input
                type="number"
                step="0.1"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700, backgroundColor: 'var(--color-surface-secondary)' }}
                placeholder="₹/L"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>

            {/* Auto Amount */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                <span>Total Amount</span>
              </label>
              <div
                className="font-mono-num"
                style={{
                  minHeight: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.55rem 0.85rem',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--color-success-text)',
                  backgroundColor: 'var(--color-success-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-success-border)',
                }}
              >
                ₹{amount || 0}
              </div>
            </div>
          </div>

          {/* Advanced fields when in advanced mode */}
          {mode === 'advanced' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date Override</label>
                <input
                  type="date"
                  className="form-control"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Shift Override</label>
                <select
                  className="form-control"
                  value={entryShift}
                  onChange={(e) => setEntryShift(e.target.value)}
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Remarks / Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. sample test passed"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action Button Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => {
                setSupplierCode('');
                setSupplierName('');
                setMilkQuantity('');
                setFat('');
                setSnf('');
                setRate('');
                setAmount('');
                codeInputRef.current?.focus();
              }}
              className="btn btn-secondary"
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="btn btn-accent btn-lg"
              style={{ fontWeight: 800, minWidth: '180px' }}
            >
              <Plus size={18} strokeWidth={3} />
              <span>Save & Next Supplier</span>
            </button>
          </div>
        </form>
      </div>

      {/* Shift Collections Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {filterDate} ({filterShift} Shift) Collection Records
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Showing {entries.length} entries for this shift
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Farmer Name</th>
                <th>Quantity</th>
                <th>Fat %</th>
                <th>SNF %</th>
                <th>Rate (₹/L)</th>
                <th>Amount (₹)</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      <span className="badge badge-gold font-mono-num">#{entry.supplierCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {entry.supplierName}
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '0.95rem' }} className="font-mono-num">
                      {entry.milkQuantity} L
                    </td>
                    <td className="font-mono-num">{entry.fat > 0 ? `${entry.fat}%` : '-'}</td>
                    <td className="font-mono-num">{entry.snf > 0 ? `${entry.snf}%` : '-'}</td>
                    <td className="font-mono-num">₹{entry.rate}</td>
                    <td style={{ fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                      {entry.time || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => setPrintSlipData(entry)}
                          className="btn-icon-sm btn-secondary"
                          title="Print Milk Slip"
                        >
                          <Printer size={14} />
                        </button>
                        {(user?.role === 'owner' || user?.role === 'manager') && (
                          <button
                            onClick={() => setDeleteId(entry._id)}
                            className="btn-icon-sm btn-ghost"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete Entry"
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                    No milk entries recorded for {filterDate} ({filterShift} Shift). Enter supplier code above to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Milk Collection Record"
        message="Are you sure you want to delete this milk collection entry? This will reverse the purchase amount from the supplier's balance."
        confirmText="Yes, Delete Record"
        isDanger={true}
      />

      {/* Printable Milk Slip Modal */}
      {printSlipData && (
        <div className="modal-overlay" onClick={() => setPrintSlipData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Farmer Milk Slip</h3>
              <button onClick={() => setPrintSlipData(null)} className="btn-icon-sm btn-ghost">✕</button>
            </div>

            <div className="modal-body">
              <div
                id="printable-slip"
                style={{
                  border: '1.5px dashed #0F172A',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>BALAJI DAIRY</h2>
                  <p style={{ fontSize: '0.75rem', margin: '2px 0 0 0' }}>Fresh Milk Collection Center</p>
                </div>

                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Farmer Code:</span>
                    <strong>#{printSlipData.supplierCode}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Farmer Name:</span>
                    <strong>{printSlipData.supplierName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date & Shift:</span>
                    <span>{printSlipData.date} ({printSlipData.shift})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Time:</span>
                    <span>{printSlipData.time || new Date().toLocaleTimeString()}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '0.35rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                    <span>Quantity:</span>
                    <span>{printSlipData.milkQuantity} L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fat:</span>
                    <span>{printSlipData.fat}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SNF:</span>
                    <span>{printSlipData.snf}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rate:</span>
                    <span>₹{printSlipData.rate}/L</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '0.5rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900 }}>
                    <span>Total Amount:</span>
                    <span>₹{printSlipData.amount}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #999', fontSize: '0.7rem' }}>
                  Thank you! • Balaji Dairy ERP
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setPrintSlipData(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="btn btn-primary btn-sm"
              >
                <Printer size={16} />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilkCollection;
