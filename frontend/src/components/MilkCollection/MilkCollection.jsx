import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { milkEntryService, supplierService } from '../../services/api';
import {
  calculateRate,
  csvEscape,
  hasMilkEntryInput,
  isMilkEntryDirty,
  validateMilkEntryRow,
} from '../../utils/milkEntryGridUtils';
import './MilkCollection.css';

const getISTDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const getDefaultShift = () => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()));
  return hour < 14 ? 'Morning' : 'Evening';
};

const getISTTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

const formatNumber = (value, digits = 2) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

const dateLabel = (date) => {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const makeOriginal = (entry) => ({
  fat: String(Number(entry.fat || 0)),
  snf: String(Number(entry.snf || 0)),
  milkQuantity: String(entry.milkQuantity ?? ''),
  amount: String(entry.amount ?? ''),
});

const buildRow = (supplier, entry, duplicateCount = 1) => {
  const original = entry ? makeOriginal(entry) : null;
  return {
    supplierCode: Number(supplier.supplierCode),
    supplierName: supplier.supplierName || entry?.supplierName || 'Unknown Supplier',
    supplierId: supplier.id || supplier._id || null,
    entryId: entry?._id || entry?.id || null,
    original,
    duplicateCount,
    fat: entry?.fat ? String(entry.fat) : '',
    snf: entry?.snf ? String(entry.snf) : '',
    milkQuantity: entry ? String(entry.milkQuantity ?? '') : '',
    amount: entry ? String(entry.amount ?? '') : '',
  };
};

const rowStatus = (row) => {
  const dirty = isMilkEntryDirty(row);
  if (row.duplicateCount > 1) return { label: 'Duplicate records', className: 'duplicate' };
  if (row.entryId && !dirty) return { label: 'Saved', className: 'saved' };
  if (row.entryId && dirty) return { label: 'Edited', className: 'edited' };
  if (!hasMilkEntryInput(row)) return { label: 'Pending', className: 'pending' };
  return validateMilkEntryRow(row)
    ? { label: 'Incomplete', className: 'incomplete' }
    : { label: 'Ready', className: 'ready' };
};

const MilkCollection = () => {
  const [date, setDate] = useState(getISTDate());
  const [shift, setShift] = useState(getDefaultShift());
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [savedEntries, setSavedEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const loadSequence = useRef(0);

  const loadData = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError('');
    setMessage('');
    setRows([]);
    setSavedEntries([]);
    setSuppliers([]);
    setRowErrors({});
    try {
      const [supplierResult, entryResult] = await Promise.all([
        supplierService.getSuppliers(),
        milkEntryService.getEntries({ startDate: date, endDate: date, shift }),
      ]);
      if (sequence !== loadSequence.current) return;

      const supplierList = supplierResult?.data || [];
      const fetchedEntries = [...(entryResult?.data || [])].sort((a, b) =>
        String(b.time || '').localeCompare(String(a.time || '')) ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      );
      const duplicateCounts = new Map();
      fetchedEntries.forEach((entry) => {
        const code = Number(entry.supplierCode);
        duplicateCounts.set(code, (duplicateCounts.get(code) || 0) + 1);
      });

      const entriesByCode = new Map();
      fetchedEntries.forEach((entry) => {
        const code = Number(entry.supplierCode);
        if (!entriesByCode.has(code)) entriesByCode.set(code, entry);
      });

      const mergedSuppliers = [...supplierList];
      const supplierCodes = new Set(supplierList.map((supplier) => Number(supplier.supplierCode)));
      fetchedEntries.forEach((entry) => {
        const code = Number(entry.supplierCode);
        if (!supplierCodes.has(code)) {
          supplierCodes.add(code);
          mergedSuppliers.push({ supplierCode: code, supplierName: entry.supplierName || 'Unknown Supplier' });
        }
      });

      mergedSuppliers.sort((a, b) => Number(a.supplierCode) - Number(b.supplierCode));
      const nextRows = mergedSuppliers.map((supplier) => {
        const code = Number(supplier.supplierCode);
        return buildRow(supplier, entriesByCode.get(code), duplicateCounts.get(code) || 1);
      });

      setSuppliers(supplierList);
      setSavedEntries(fetchedEntries);
      setRows(nextRows);
      setRowErrors({});
    } catch (err) {
      if (sequence === loadSequence.current) {
        setError(err.message || 'Unable to load supplier milk records.');
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [date, shift]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dirtyRows = useMemo(() => rows.filter(isMilkEntryDirty), [rows]);
  const enteredSupplierCodes = useMemo(
    () => new Set(rows.filter((row) => row.entryId || hasMilkEntryInput(row)).map((row) => row.supplierCode)),
    [rows]
  );
  const enteredCount = enteredSupplierCodes.size;
  const pendingCount = Math.max(rows.length - enteredCount, 0);

  const summaryRows = useMemo(() => savedEntries
    .map((entry) => ({ ...entry, rate: calculateRate(entry.milkQuantity, entry.amount) ?? 0 }))
    .sort((a, b) => Number(a.supplierCode) - Number(b.supplierCode) || String(a.time || '').localeCompare(String(b.time || ''))),
  [savedEntries]);

  const summary = useMemo(() => {
    const totalMilk = summaryRows.reduce((sum, entry) => sum + Number(entry.milkQuantity || 0), 0);
    const totalAmount = summaryRows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const fatEntries = summaryRows.filter((entry) => Number(entry.fat || 0) > 0);
    const snfEntries = summaryRows.filter((entry) => Number(entry.snf || 0) > 0);
    const fatMilkWeight = fatEntries.reduce((sum, entry) => sum + Number(entry.milkQuantity || 0), 0);
    const snfMilkWeight = snfEntries.reduce((sum, entry) => sum + Number(entry.milkQuantity || 0), 0);
    const fatWeighted = fatEntries.reduce((sum, entry) => sum + Number(entry.fat || 0) * Number(entry.milkQuantity || 0), 0);
    const snfWeighted = snfEntries.reduce((sum, entry) => sum + Number(entry.snf || 0) * Number(entry.milkQuantity || 0), 0);
    const enteredSupplierCount = new Set(summaryRows.map((entry) => Number(entry.supplierCode))).size;
    return {
      totalSuppliers: rows.length,
      enteredSupplierCount,
      totalMilk,
      totalAmount,
      averageRate: totalMilk ? totalAmount / totalMilk : 0,
      averageFat: fatMilkWeight ? fatWeighted / fatMilkWeight : 0,
      averageSnf: snfMilkWeight ? snfWeighted / snfMilkWeight : 0,
    };
  }, [summaryRows, rows.length]);

  const handleFieldChange = (supplierCode, field, value) => {
    setRows((previous) => previous.map((row) =>
      row.supplierCode === supplierCode ? { ...row, [field]: value } : row
    ));
    setRowErrors((previous) => {
      if (!previous[supplierCode]) return previous;
      const next = { ...previous };
      delete next[supplierCode];
      return next;
    });
    setError('');
    setMessage('');
  };

  const handleEnterNavigation = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const table = event.currentTarget.closest('table');
    const inputs = Array.from(table?.querySelectorAll('input[data-grid-input]:not([disabled])') || []);
    const currentIndex = inputs.indexOf(event.currentTarget);
    if (currentIndex >= 0) inputs[currentIndex + 1]?.focus();
  };

  const confirmDiscardDrafts = () => {
    if (!dirtyRows.length) return true;
    return window.confirm('Discard unsaved changes and change the date or shift?');
  };

  const handleDateChange = (nextDate) => {
    if (!nextDate || nextDate === date || !confirmDiscardDrafts()) return;
    setShowSummary(false);
    setDate(nextDate);
  };

  const handleShiftChange = (nextShift) => {
    if (nextShift === shift || !confirmDiscardDrafts()) return;
    setShowSummary(false);
    setShift(nextShift);
  };

  const saveEntries = async () => {
    const changedRows = dirtyRows.filter((row) => row.entryId || hasMilkEntryInput(row));
    if (!changedRows.length) {
      setMessage('There are no changes to save.');
      return;
    }

    const nextErrors = {};
    changedRows.forEach((row) => {
      const validation = validateMilkEntryRow(row);
      if (validation) nextErrors[row.supplierCode] = validation;
    });
    if (Object.keys(nextErrors).length) {
      setRowErrors(nextErrors);
      setError('Fix the highlighted rows before saving.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const newRows = changedRows.filter((row) => !row.entryId);
      const updates = changedRows.filter((row) => row.entryId);
      if (newRows.length) {
        const time = getISTTime();
        await milkEntryService.bulkAddEntries(newRows.map((row) => ({
          supplierCode: row.supplierCode,
          supplierName: row.supplierName,
          date,
          time,
          shift,
          milkQuantity: Number(row.milkQuantity),
          fat: Number(row.fat || 0),
          snf: Number(row.snf || 0),
          amount: Number(row.amount),
        })), suppliers);
      }

      for (let index = 0; index < updates.length; index += 6) {
        await Promise.all(updates.slice(index, index + 6).map((row) =>
          milkEntryService.updateEntry(row.entryId, {
            date,
            shift,
            milkQuantity: Number(row.milkQuantity),
            fat: Number(row.fat || 0),
            snf: Number(row.snf || 0),
            amount: Number(row.amount),
          })
        ));
      }

      await loadData();
      setMessage(`Saved ${newRows.length} new and updated ${updates.length} existing supplier record(s).`);
    } catch (err) {
      await loadData();
      setError(err.message || 'Some entries could not be saved. The table has been refreshed to show saved data');
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = () => {
    if (dirtyRows.length) {
      setError('Save all changes before generating the summary.');
      return;
    }
    setError('');
    setMessage('');
    setShowSummary(true);
  };

  const downloadSummary = () => {
    const csvRows = [
      ['BALAJI DAIRY'],
      ['Date', date],
      ['Shift', shift],
      ['Total suppliers', summary.totalSuppliers],
      ['Suppliers entered', summary.enteredSupplierCount],
      ['Total milk (L)', summary.totalMilk.toFixed(2)],
      ['Total amount (₹)', summary.totalAmount.toFixed(2)],
      ['Overall average rate (₹/L)', summary.averageRate.toFixed(2)],
      ['Average FAT', summary.averageFat.toFixed(2)],
      ['Average SNF', summary.averageSnf.toFixed(2)],
      [],
      ['Supplier Code', 'Supplier Name', 'FAT', 'SNF', 'Milk Quantity (L)', 'Amount (₹)', 'Rate (₹/L)'],
      ...summaryRows.map((entry) => [
        entry.supplierCode,
        entry.supplierName,
        Number(entry.fat || 0).toFixed(2),
        Number(entry.snf || 0).toFixed(2),
        Number(entry.milkQuantity || 0).toFixed(2),
        Number(entry.amount || 0).toFixed(2),
        Number(entry.rate || 0).toFixed(2),
      ]),
      ['TOTAL', '', summary.averageFat.toFixed(2), summary.averageSnf.toFixed(2), summary.totalMilk.toFixed(2), summary.totalAmount.toFixed(2), summary.averageRate.toFixed(2)],
    ];
    const csv = csvRows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Balaji_Dairy_${date}_${shift}_Summary.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const duplicateRecordCount = useMemo(
    () => rows.reduce((sum, row) => sum + Math.max(row.duplicateCount - 1, 0), 0),
    [rows]
  );

  if (showSummary) {
    return (
      <section className="milk-summary-screen">
        <header className="milk-summary-heading">
          <div className="milk-summary-brand">BALAJI DAIRY</div>
          <h1>Milk Collection Summary</h1>
          <p>{dateLabel(date)} <span>•</span> {shift} Shift</p>
        </header>

        <div className="milk-summary-stats">
          <div className="milk-summary-stat">
            <span>Total Suppliers</span>
            <strong>{summary.totalSuppliers.toLocaleString('en-IN')}</strong>
          </div>
          <div className="milk-summary-stat">
            <span>Suppliers Entered</span>
            <strong>{summary.enteredSupplierCount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="milk-summary-stat">
            <span>Total Milk</span>
            <strong>{formatNumber(summary.totalMilk)} L</strong>
          </div>
          <div className="milk-summary-stat">
            <span>Total Amount</span>
            <strong>{formatCurrency(summary.totalAmount)}</strong>
          </div>
          <div className="milk-summary-stat">
            <span>Average Rate</span>
            <strong>{formatCurrency(summary.averageRate)} / L</strong>
          </div>
          <div className="milk-summary-stat">
            <span>Weighted FAT / SNF</span>
            <strong>{formatNumber(summary.averageFat)} / {formatNumber(summary.averageSnf)}</strong>
          </div>
        </div>

        {duplicateRecordCount > 0 && (
          <div className="milk-entry-alert">
            Found {duplicateRecordCount} duplicate record(s) for the same supplier, date and shift. They are shown separately in this summary and have not been deleted.
          </div>
        )}

        <div className="milk-summary-table-wrap">
          <table className="milk-summary-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>FAT</th>
                <th>SNF</th>
                <th>Milk (L)</th>
                <th>Amount (₹)</th>
                <th>Rate (₹/L)</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((entry, index) => (
                <tr key={entry._id || entry.id || `${entry.supplierCode}-${index}`}>
                  <td>{entry.supplierCode}</td>
                  <td>{entry.supplierName}</td>
                  <td>{formatNumber(entry.fat)}</td>
                  <td>{formatNumber(entry.snf)}</td>
                  <td>{formatNumber(entry.milkQuantity)}</td>
                  <td>{formatCurrency(entry.amount)}</td>
                  <td>{formatNumber(entry.rate)}</td>
                </tr>
              ))}
              {summaryRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="milk-summary-empty">No saved entries for this date and shift.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">TOTAL / WEIGHTED AVERAGE</td>
                <td>{formatNumber(summary.averageFat)}</td>
                <td>{formatNumber(summary.averageSnf)}</td>
                <td>{formatNumber(summary.totalMilk)}</td>
                <td>{formatCurrency(summary.totalAmount)}</td>
                <td>{formatNumber(summary.averageRate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="milk-summary-actions">
          <button type="button" className="milk-entry-button secondary" onClick={() => window.print()}>Print Summary</button>
          <button type="button" className="milk-entry-button primary" onClick={downloadSummary}>Download Summary</button>
          <button type="button" className="milk-entry-button outline" onClick={() => setShowSummary(false)}>Back to Data Entry</button>
        </div>
      </section>
    );
  }

  return (
    <section className="milk-entry-page">
      <div className="milk-entry-heading">
        <div>
          <h1>Milk Data Entry</h1>
          <p>Enter supplier milk records for the selected date and shift.</p>
        </div>
        <div className="milk-entry-progress">
          <strong>{enteredCount} / {suppliers.length}</strong>
          <span>entered</span>
          <span className="milk-entry-progress-divider">•</span>
          <span>{pendingCount} pending</span>
        </div>
      </div>

      <div className="milk-entry-toolbar">
        <label className="milk-entry-date-field">
          <span>Date</span>
          <input type="date" value={date} disabled={loading || saving} onChange={(event) => handleDateChange(event.target.value)} />
        </label>
        <div className="milk-entry-shift-selector" role="group" aria-label="Milk collection shift">
          <button type="button" className={shift === 'Morning' ? 'selected' : ''} disabled={loading || saving} onClick={() => handleShiftChange('Morning')}>Morning</button>
          <button type="button" className={shift === 'Evening' ? 'selected' : ''} disabled={loading || saving} onClick={() => handleShiftChange('Evening')}>Evening</button>
        </div>
      </div>

      {error && <div className="milk-entry-alert error">{error}</div>}
      {message && <div className="milk-entry-alert success">{message}</div>}
      {duplicateRecordCount > 0 && (
        <div className="milk-entry-alert">
          This date and shift has {duplicateRecordCount} extra duplicate record(s). They are preserved and flagged; check the summary before finalizing.
        </div>
      )}

      <div className="milk-entry-table-wrap">
        {loading ? (
          <div className="milk-entry-loading">Loading suppliers and saved entries…</div>
        ) : (
          <table className="milk-grid-table">
            <thead>
              <tr>
                <th className="supplier-code-cell">Code</th>
                <th className="supplier-name-cell">Supplier Name</th>
                <th>FAT</th>
                <th>SNF</th>
                <th>Milk (L) <span className="required">*</span></th>
                <th>Amount (₹) <span className="required">*</span></th>
                <th>Rate (₹/L)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = rowStatus(row);
                const rate = calculateRate(row.milkQuantity, row.amount);
                return (
                  <tr key={row.supplierCode} className={`milk-grid-row ${status.className}`}>
                    <td className="supplier-code-cell"><strong>{row.supplierCode}</strong></td>
                    <td className="supplier-name-cell">{row.supplierName}</td>
                    {['fat', 'snf', 'milkQuantity', 'amount'].map((field) => (
                      <td key={field} className={`milk-grid-input-cell ${rowErrors[row.supplierCode] ? 'has-error' : ''}`}>
                        <input
                          data-grid-input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step={field === 'fat' || field === 'snf' ? '0.1' : '0.01'}
                          value={row[field]}
                          aria-label={`${row.supplierName} ${field}`}
                          onChange={(event) => handleFieldChange(row.supplierCode, field, event.target.value)}
                          onKeyDown={handleEnterNavigation}
                          disabled={loading || saving}
                        />
                      </td>
                    ))}
                    <td className="milk-grid-rate">{rate === null ? '—' : formatNumber(rate)}</td>
                    <td className="milk-grid-status">
                      <span className={`milk-entry-status ${status.className}`}>{status.label}</span>
                      {rowErrors[row.supplierCode] && <small className="milk-grid-error">{rowErrors[row.supplierCode]}</small>}
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan="8" className="milk-entry-empty">No suppliers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <footer className="milk-entry-footer">
        <div className="milk-entry-footer-note">
          <span>Rate is calculated automatically: Amount ÷ Milk Quantity.</span>
          {dirtyRows.length > 0 && <strong>{dirtyRows.length} unsaved row(s)</strong>}
        </div>
        <div className="milk-entry-footer-actions">
          <button type="button" className="milk-entry-button secondary" onClick={saveEntries} disabled={loading || saving || dirtyRows.length === 0}>
            {saving ? 'Saving…' : 'Save Entries'}
          </button>
          <button type="button" className="milk-entry-button primary" onClick={generateSummary} disabled={loading || saving || dirtyRows.length > 0}>
            Generate Summary
          </button>
        </div>
        {dirtyRows.length > 0 && <p className="milk-entry-save-hint">Save your changes before generating the summary.</p>}
      </footer>
    </section>
  );
};

export default MilkCollection;
