import React, { useState, useEffect } from 'react';
import { milkEntryService, supplierService } from '../../services/api';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Loading, EmptyState } from '../Common/MaterialComponents';

const MilkCollection = () => {
  // Form State
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  // Time & Shift Detect
  const getISTDateTime = () => {
    const d = new Date();
    // UTC offset for IST is +5.5 hours
    const localTime = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istTime = new Date(localTime + (3600000 * 5.5));
    
    const dateStr = istTime.toISOString().split('T')[0];
    const timeStr = istTime.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    return { dateStr, timeStr };
  };

  const detectShift = (timeString) => {
    const hour = parseInt(timeString.split(':')[0], 10);
    // Morning shift is typically before 2 PM (14:00)
    return hour < 14 ? 'Morning' : 'Evening';
  };

  const initDateTime = getISTDateTime();
  const [entryDate, setEntryDate] = useState(initDateTime.dateStr);
  const [entryTime, setEntryTime] = useState(initDateTime.timeStr);
  const [shift, setShift] = useState(detectShift(initDateTime.timeStr));
  const [customDateTime, setCustomDateTime] = useState(false);

  // Filters State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterShift, setFilterShift] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterVillage, setFilterVillage] = useState('');

  // Data Listing State
  const [entries, setEntries] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Live calculated fields
  const calculatedRate = (quantity && amount) 
    ? (parseFloat(amount) / parseFloat(quantity)).toFixed(2) 
    : '0.00';

  // Live Look up on code entry
  const handleCodeBlur = async () => {
    if (!supplierCode) return;
    setFormError('');
    try {
      const res = await supplierService.getSuppliers({ search: supplierCode });
      if (res.success && res.data.length > 0) {
        // Exact match check
        const match = res.data.find(s => s.supplierCode === parseInt(supplierCode, 10));
        if (match) {
          if (match.status !== 'active') {
            setFormError(`Supplier #${supplierCode} is INACTIVE`);
            setSupplierName('');
          } else {
            setSupplierName(match.supplierName);
          }
        } else {
          setSupplierName('');
          setFormError(`Supplier Code #${supplierCode} not registered`);
        }
      } else {
        setSupplierName('');
        setFormError(`Supplier Code #${supplierCode} not registered`);
      }
    } catch (err) {
      console.error('Supplier lookup error:', err);
    }
  };

  // Sync date/time if not custom
  useEffect(() => {
    if (!customDateTime) {
      const timer = setInterval(() => {
        const ist = getISTDateTime();
        setEntryDate(ist.dateStr);
        setEntryTime(ist.timeStr);
        setShift(detectShift(ist.timeStr));
      }, 30000); // Check every 30s
      return () => clearInterval(timer);
    }
  }, [customDateTime]);

  const loadEntries = async () => {
    try {
      setLoadingList(true);
      const filters = {
        startDate,
        endDate,
        shift: filterShift,
        supplierCode: filterCode,
        supplierName: filterName,
        village: filterVillage
      };
      const res = await milkEntryService.getEntries(filters);
      if (res.success) {
        setEntries(res.data);
      }
    } catch (err) {
      console.error('Failed to load milk entries:', err);
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
      setFormError('Please enter Supplier Code, Quantity and Amount');
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

  // PDF Export
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
    <div className="collection-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      <div className="grid grid-cols-3" style={{ gap: '1rem', alignItems: 'start' }}>
        {/* Entry Screen (Handheld style) */}
        <div style={{ gridColumn: 'span 1' }}>
          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--md-sys-color-surface-variant)', paddingBottom: '0.5rem' }}>
              Collection Desk
            </h3>

            {formError && <div className="error-alert" style={{ marginBottom: '1rem' }}>{formError}</div>}
            {formSuccess && <div className="success-alert" style={{ marginBottom: '1rem' }}>{formSuccess}</div>}

            <form onSubmit={handleSubmitEntry}>
              <Input
                label="Supplier Code (Press Tab / Blur to look up)*"
                type="number"
                inputMode="numeric"
                placeholder="Farmer numeric code"
                value={supplierCode}
                onChange={(e) => {
                  setSupplierCode(e.target.value);
                  setSupplierName('');
                }}
                onBlur={handleCodeBlur}
                required
              />

              <Input
                label="Supplier Name"
                type="text"
                value={supplierName}
                readOnly
                placeholder="Farmer name auto-fills"
                style={{ opacity: 0.85 }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                  label="Date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => {
                    setEntryDate(e.target.value);
                    setCustomDateTime(true);
                  }}
                  className="flex-1"
                />
                <Input
                  label="Time"
                  type="time"
                  value={entryTime}
                  onChange={(e) => {
                    setEntryTime(e.target.value);
                    setCustomDateTime(true);
                  }}
                  className="flex-1"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-md3-label">Shift</label>
                  <select 
                    className="input-md3-control" 
                    value={shift} 
                    onChange={(e) => {
                      setShift(e.target.value);
                      setCustomDateTime(true);
                    }}
                  >
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                {customDateTime && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Button variant="outlined" onClick={() => setCustomDateTime(false)} style={{ height: '48px', fontSize: '0.75rem', padding: '0 0.5rem' }}>
                      Auto Live
                    </Button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                  label="Quantity (Liters)*"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="e.g. 10.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="flex-1"
                />
                <Input
                  label="Total Amount (₹)*"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="flex-1"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                  label="FAT (%)"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="e.g. 4.5"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label="SNF (%)"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="e.g. 8.5"
                  value={snf}
                  onChange={(e) => setSnf(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Dynamic Rates Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                borderRadius: 'var(--md-shape-corner-medium)',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '1.25rem'
              }}>
                <span>Calculated Rate:</span>
                <span>₹ {calculatedRate} / Liter</span>
              </div>

              <Input
                label="Remarks"
                type="text"
                placeholder="Optional notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />

              <Button type="submit" variant="primary" style={{ width: '100%' }}>
                Save Milk Entry
              </Button>
            </form>
          </Card>
        </div>

        {/* Logs Listing */}
        <div style={{ gridColumn: 'span 2' }}>
          <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Filters & Query</h3>
            
            <div className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <div>
                <label className="input-md3-label">Shift</label>
                <select className="input-md3-control" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
              <Input label="Farmer Code" type="number" placeholder="Code" value={filterCode} onChange={(e) => setFilterCode(e.target.value)} />
              <Input label="Farmer Name" type="text" placeholder="Search name" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
              <Input label="Village" type="text" placeholder="Search village" value={filterVillage} onChange={(e) => setFilterVillage(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={exportToExcel} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>Export Excel</Button>
              <Button variant="outlined" onClick={exportToPDF} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>Print PDF</Button>
            </div>
          </Card>

          <Card style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Milk Collection Log</h3>

            <div className="table-container desktop-only">
              {loadingList ? (
                <Loading label="Filtering entries..." />
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
                            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                              {e.supplierName}
                            </div>
                          </td>
                          <td>
                            {e.date}
                            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                              {e.time}
                            </div>
                          </td>
                          <td>
                            <Badge type={e.shift === 'Morning' ? 'primary' : 'success'}>
                              {e.shift}
                            </Badge>
                          </td>
                          <td>{e.milkQuantity} L</td>
                          <td>{e.fat}% / {e.snf}%</td>
                          <td style={{ fontWeight: '600' }}>₹{e.amount}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="danger"
                              style={{ padding: '0.2rem 0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteEntry(e._id, e.supplierCode)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                          No milk collection records match the filter query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile View Card List */}
            <div className="mobile-card-list mobile-only">
              {loadingList ? (
                <Loading label="Filtering entries..." />
              ) : entries.length > 0 ? (
                entries.map((e) => (
                  <div key={e._id} className="mobile-row-card">
                    <div className="mobile-row-card-header">
                      <div className="mobile-row-card-title">#{e.supplierCode} - {e.supplierName}</div>
                      <Badge type={e.shift === 'Morning' ? 'primary' : 'success'}>
                        {e.shift}
                      </Badge>
                    </div>
                    <div className="mobile-row-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Liters Collected:</span>
                        <span style={{ fontWeight: '600' }}>{e.milkQuantity} L</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>FAT / SNF:</span>
                        <span>{e.fat}% / {e.snf}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span>Date / Time:</span>
                        <span>{e.date} • {e.time}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', borderTop: '1px dashed var(--md-sys-color-surface-variant)', paddingTop: '0.25rem' }}>
                        <span style={{ fontWeight: '600' }}>Total Amount:</span>
                        <span style={{ fontWeight: '700', color: 'var(--md-sys-color-primary)', fontSize: '0.95rem' }}>₹{e.amount}</span>
                      </div>
                    </div>
                    <div className="mobile-row-card-actions">
                      <Button
                        variant="danger"
                        style={{ padding: '0.2rem 0.5rem', minHeight: '36px', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteEntry(e._id, e.supplierCode)}
                      >
                        Delete Entry
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No milk collection records match the filter query" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MilkCollection;
