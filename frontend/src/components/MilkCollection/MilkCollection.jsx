import React, { useState, useEffect } from 'react';
import { supplierService, milkEntryService, rateChartService } from '../../services/api';
import * as XLSX from 'xlsx';

const MilkCollection = () => {
  // Collection Entries State
  const [entries, setEntries] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filters State
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterShift, setFilterShift] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  // Time & Shift Detect
  const [customDateTime, setCustomDateTime] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryTime, setEntryTime] = useState(new Date().toLocaleTimeString('en-IN', { hour12: false }).substring(0, 8));
  const [shift, setShift] = useState('Morning');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [listError, setListError] = useState('');

  // Auto-detect shift on time change
  const autoDetectShift = (timeStr) => {
    try {
      const hour = parseInt(timeStr.split(':')[0], 10);
      if (hour >= 4 && hour < 12) {
        setShift('Morning');
      } else {
        setShift('Evening');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clock effect to keep date/time live unless user overrides
  useEffect(() => {
    if (customDateTime) return;

    const timer = setInterval(() => {
      const dateObj = new Date();
      // Format YYYY-MM-DD
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeStr = dateObj.toTimeString().split(' ')[0]; // HH:MM:SS
      setEntryDate(dateStr);
      setEntryTime(timeStr);
      autoDetectShift(timeStr);
    }, 1000);

    return () => clearInterval(timer);
  }, [customDateTime]);

  // Lookup Supplier Name when code is entered
  const lookupSupplier = async (code) => {
    if (!code) {
      setSupplierName('');
      return;
    }
    try {
      const res = await supplierService.getSupplierByCode(code);
      if (res.success) {
        setSupplierName(res.data.supplierName);
        setFormError('');
      }
    } catch (err) {
      setSupplierName('');
      setFormError(`Farmer Code #${code} not found or inactive`);
    }
  };

  // Trigger lookup on blur or when code length exceeds threshold
  const handleCodeBlur = () => {
    lookupSupplier(supplierCode);
  };

  const handleQuantityChange = (qtyVal) => {
    setQuantity(qtyVal);
  };

  // Load collection logs
  const loadEntries = async () => {
    try {
      setLoadingList(true);
      setListError('');
      const filters = {
        startDate,
        endDate,
        supplierCode: filterCode,
        supplierName: filterName,
        shift: filterShift,
        village: filterVillage,
      };
      const res = await milkEntryService.getEntries(filters);
      if (res.success) {
        setEntries(res.data);
      }
    } catch (err) {
      setListError('Failed to fetch milk collection logs');
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [startDate, endDate, filterCode, filterName, filterShift, filterVillage]);

  // Submit milk collection entry
  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!supplierCode || !supplierName || !quantity || !amount) {
      setFormError('Please fill in Supplier Code, Quantity and Amount');
      return;
    }

    try {
      const res = await milkEntryService.addEntry({
        supplierCode: parseInt(supplierCode, 10),
        milkQuantity: parseFloat(quantity),
        fat: fat ? parseFloat(fat) : 0,
        snf: snf ? parseFloat(snf) : 0,
        date: entryDate,
        time: entryTime,
        shift,
        amount: parseFloat(amount),
        remarks,
      });

      if (res.success) {
        setFormSuccess(`Entry logged for #${supplierCode} - Qty: ${quantity}L, Amt: ₹${amount}`);
        // Reset form except Code to facilitate quick consecutive entries for next supplier
        setQuantity('');
        setFat('');
        setSnf('');
        setAmount('');
        setRemarks('');
        loadEntries();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error occurred while saving entry');
      console.error(err);
    }
  };

  const handleDeleteEntry = async (id, code) => {
    if (!window.confirm('Delete this milk collection entry record?')) {
      return;
    }
    try {
      const res = await milkEntryService.deleteEntry(id);
      if (res.success) {
        loadEntries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Excel Export
  const exportToExcel = () => {
    const formattedData = entries.map((e) => ({
      'Supplier Code': e.supplierCode,
      'Supplier Name': e.supplierName,
      'Date': e.date,
      'Time': e.time,
      'Shift': e.shift,
      'Milk Liters': e.milkQuantity,
      'Fat %': e.fat,
      'SNF %': e.snf,
      'Amount (Rs)': e.amount,
      'Remarks': e.remarks || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Milk_Entries');

    XLSX.writeFile(workbook, `Milk_Collection_${startDate}_to_${endDate}.xlsx`);
  };

  // PDF Export using Browser Print Page formatting
  const exportToPDF = () => {
    const totalQty = entries.reduce((sum, e) => sum + e.milkQuantity, 0);
    const totalAmt = entries.reduce((sum, e) => sum + e.amount, 0);

    const printContent = `
      <html>
        <head>
          <title>Milk Collection - Balaji Dairy</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e40af; margin-bottom: 5px; }
            h4 { text-align: center; font-weight: normal; margin-top: 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background-color: #f3f4f6; color: #4b5563; font-weight: bold; border: 1px solid #d1d5db; padding: 6px; text-align: left; }
            td { border: 1px solid #e5e7eb; padding: 6px; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .total-row { font-weight: bold; background-color: #e5e7eb !important; }
          </style>
        </head>
        <body>
          <h2>BALAJI DAIRY COLLECTION CENTER</h2>
          <h4>COLLECTION STATEMENT (${startDate} to ${endDate})</h4>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Qty (L)</th>
                <th>FAT (%)</th>
                <th>SNF (%)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td><b>#${e.supplierCode}</b></td>
                  <td>${e.supplierName}</td>
                  <td>${e.date}</td>
                  <td>${e.shift}</td>
                  <td>${e.milkQuantity} L</td>
                  <td>${e.fat}%</td>
                  <td>${e.snf}%</td>
                  <td>₹${e.amount}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">TOTAL SUMMARY</td>
                <td>${Math.round(totalQty * 100) / 100} L</td>
                <td colspan="2">-</td>
                <td>₹${Math.round(totalAmt * 100) / 100}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="collection-view">
      <div className="view-header">
        <div>
          <h1>Milk Collection Entry</h1>
          <p className="text-muted">Record daily morning and evening milk collection batches</p>
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Entry Screen */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            New Entry Form
          </h3>

          {formError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{formError}</div>}
          {formSuccess && <div className="success-alert" style={{ marginBottom: '1rem' }}>{formSuccess}</div>}

          <form onSubmit={handleSubmitEntry}>
            <div className="form-group">
              <label className="form-label">Supplier Code*</label>
              <input
                type="number"
                className="form-control"
                placeholder="Type farmer code & press Tab"
                value={supplierCode}
                onChange={(e) => {
                  setSupplierCode(e.target.value);
                  setSupplierName(''); // Reset name until look up runs
                }}
                onBlur={handleCodeBlur}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Name</label>
              <input
                type="text"
                className="form-control"
                value={supplierName}
                readOnly
                placeholder="Farmer name auto-fills"
                style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: '500' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={entryDate}
                  onChange={(e) => {
                    setCustomDateTime(true);
                    setEntryDate(e.target.value);
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Time</label>
                <input
                  type="text"
                  className="form-control"
                  value={entryTime}
                  onChange={(e) => {
                    setCustomDateTime(true);
                    setEntryTime(e.target.value);
                    autoDetectShift(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Shift</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="radio"
                    name="shift"
                    checked={shift === 'Morning'}
                    onChange={() => {
                      setCustomDateTime(true);
                      setShift('Morning');
                    }}
                  />
                  Morning
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input
                    type="radio"
                    name="shift"
                    checked={shift === 'Evening'}
                    onChange={() => {
                      setCustomDateTime(true);
                      setShift('Evening');
                    }}
                  />
                  Evening
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Milk Quantity (Liters)*</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                placeholder="Liters quantity"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">FAT (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="e.g. 6.5"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">SNF (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="e.g. 9.2"
                  value={snf}
                  onChange={(e) => setSnf(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Total Amount (₹)*</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="Total Amount in ₹"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input
                type="text"
                className="form-control"
                placeholder="Any special remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Save Milk Entry
            </button>
            {customDateTime && (
              <button
                type="button"
                className="btn btn-outline btn-block"
                style={{ marginTop: '0.5rem' }}
                onClick={() => setCustomDateTime(false)}
              >
                Reset to Auto Live Time
              </button>
            )}
          </form>
        </div>

        {/* Logs Listing */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Filters & Queries</h3>
            <div className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Shift</label>
                <select className="form-control" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
              <div>
                <label className="form-label">Supplier Code</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Code"
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Farmer Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Village</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Village"
                  value={filterVillage}
                  onChange={(e) => setFilterVillage(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={exportToExcel}>
                Export Excel
              </button>
              <button className="btn btn-outline" onClick={exportToPDF}>
                Print Statement
              </button>
            </div>
          </div>

          <div className="table-container">
            {loadingList ? (
              <div className="table-loading">
                <div className="spinner"></div>
                <span>Filtering entries...</span>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Date / Time</th>
                    <th>Shift</th>
                    <th>Qty</th>
                    <th>FAT/SNF</th>
                    <th>Amount</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length > 0 ? (
                    entries.map((e) => (
                      <tr key={e._id}>
                        <td>
                          <b>#{e.supplierCode}</b>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {e.supplierName}
                          </div>
                        </td>
                        <td>
                          {e.date}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                            {e.time}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${e.shift.toLowerCase()}`}>
                            {e.shift}
                          </span>
                        </td>
                        <td>{e.milkQuantity} L</td>
                        <td>{e.fat}% / {e.snf}%</td>
                        <td style={{ fontWeight: '600' }}>₹{e.amount}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => handleDeleteEntry(e._id, e.supplierCode)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        No milk collection records match the filter query.
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

export default MilkCollection;
