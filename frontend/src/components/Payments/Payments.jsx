import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/api';
import * as XLSX from 'xlsx';

const Payments = () => {
  const [ledgerList, setLedgerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Recording Payment Form State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payCode, setPayCode] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRemarks, setPayRemarks] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Detailed ledger viewing state
  const [selectedSupplierCode, setSelectedSupplierCode] = useState(null);
  const [detailedLedger, setDetailedLedger] = useState(null);
  const [loadingDetailed, setLoadingDetailed] = useState(false);

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await paymentService.getLedger({ search, village });
      if (res.success) {
        setLedgerList(res.data);
      }
    } catch (err) {
      setError('Failed to fetch payment ledger list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadLedger();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, village]);

  // Load detailed supplier ledger history
  const loadSupplierDetailedLedger = async (code) => {
    try {
      setLoadingDetailed(true);
      setSelectedSupplierCode(code);
      const res = await paymentService.getSupplierLedger(code);
      if (res.success) {
        setDetailedLedger(res);
      }
    } catch (err) {
      setError(`Failed to fetch ledger history for Supplier #${code}`);
      console.error(err);
    } finally {
      setLoadingDetailed(false);
    }
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!payCode || !payAmount) {
      setError('Please fill in Supplier Code and Amount Paid');
      return;
    }

    try {
      const res = await paymentService.recordPayment({
        supplierCode: parseInt(payCode, 10),
        amountPaid: parseFloat(payAmount),
        paymentMode: payMode,
        remarks: payRemarks,
        date: payDate,
      });

      if (res.success) {
        setSuccess(`Payment of ₹${payAmount} successfully recorded for Supplier Code #${payCode}`);
        setShowPayModal(false);
        // Reset Form
        setPayCode('');
        setPayAmount('');
        setPayRemarks('');
        setPayMode('Cash');
        setPayDate(new Date().toISOString().split('T')[0]);

        // Reload data
        loadLedger();
        if (selectedSupplierCode === parseInt(payCode, 10)) {
          loadSupplierDetailedLedger(selectedSupplierCode);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred while saving payment record');
      console.error(err);
    }
  };

  // Excel export ledger
  const exportLedgerExcel = () => {
    const formattedData = ledgerList.map((item) => ({
      'Supplier Code': item.supplierCode,
      'Supplier Name': item.supplierName,
      'Mobile Number': item.mobile,
      'Village': item.village,
      'Total Liters Collected': item.totalMilk,
      'Total Earnings (Rs)': item.totalAmount,
      'Total Paid (Rs)': item.totalPaid,
      'Pending Balance (Rs)': item.pendingAmount,
      'Status': item.status.toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger_List');
    XLSX.writeFile(workbook, `Billing_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="payments-view">
      <div className="view-header">
        <div>
          <h1>Supplier Payment Ledger</h1>
          <p className="text-muted">Manage supplier balances, payments history, and transactions ledger</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={exportLedgerExcel}>
            Export Ledger
          </button>
          <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
            Record Payment Receipt
          </button>
        </div>
      </div>

      {success && <div className="success-alert" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Ledger table list */}
        <div style={{ gridColumn: detailedLedger ? 'span 2' : 'span 3' }}>
          <div className="card filters-card" style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label className="form-label">Search Farmer Code or Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type code or farmer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Filter by Village</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter village..."
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="table-loading">
                <div className="spinner"></div>
                <span>Filtering ledger balances...</span>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Supplier Name</th>
                    <th>Village</th>
                    <th>Total Milk</th>
                    <th>Earnings (Due)</th>
                    <th>Paid Amount</th>
                    <th>Pending Balance</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerList.length > 0 ? (
                    ledgerList.map((item) => (
                      <tr
                        key={item.supplierCode}
                        className={selectedSupplierCode === item.supplierCode ? 'active-row' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => loadSupplierDetailedLedger(item.supplierCode)}
                      >
                        <td style={{ fontWeight: '600' }}>#{item.supplierCode}</td>
                        <td>{item.supplierName}</td>
                        <td>{item.village}</td>
                        <td>{item.totalMilk} L</td>
                        <td>₹{item.totalAmount}</td>
                        <td style={{ color: 'var(--secondary)', fontWeight: '500' }}>₹{item.totalPaid}</td>
                        <td style={{
                          fontWeight: '600',
                          color: item.pendingAmount > 0 ? 'var(--danger)' : 'var(--secondary)'
                        }}>
                          ₹{item.pendingAmount}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayCode(item.supplierCode.toString());
                              setShowPayModal(true);
                            }}
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        No farmers registered or matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detailed Transactions ledger */}
        {detailedLedger && (
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>{detailedLedger.supplier.supplierName}</h3>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Code: #{detailedLedger.supplier.supplierCode} | {detailedLedger.supplier.village}</span>
              </div>
              <button className="btn-close" onClick={() => setDetailedLedger(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {loadingDetailed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Compiling chronological ledger...</span>
              </div>
            ) : (
              <div>
                {/* Micro summary */}
                <div className="grid grid-cols-2" style={{ gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div>Earnings (Due): <b>₹{detailedLedger.summary.totalAmount}</b></div>
                  <div>Paid: <b style={{ color: 'var(--secondary)' }}>₹{detailedLedger.summary.totalPaid}</b></div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #cbd5e1', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                    Balance Pending: <b style={{ color: detailedLedger.summary.pendingAmount > 0 ? 'var(--danger)' : 'var(--secondary)' }}>₹{detailedLedger.summary.pendingAmount}</b>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Chronological History</h4>
                <div className="ledger-timeline-container" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {detailedLedger.history.length > 0 ? (
                    detailedLedger.history.map((txn, idx) => (
                      <div key={idx} className="timeline-item" style={{
                        borderLeft: `2px solid ${txn.txnType === 'debit' ? 'var(--primary)' : 'var(--secondary)'}`,
                        paddingLeft: '0.5rem',
                        marginBottom: '0.75rem',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: '600' }}>{txn.type}</span>
                          <span className="text-muted">{txn.date}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0' }}>{txn.description}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '500' }}>
                          <span style={{ color: txn.txnType === 'debit' ? 'var(--text-main)' : 'var(--secondary)' }}>
                            {txn.txnType === 'debit' ? '+' : '-'} ₹{txn.amount}
                          </span>
                          <span className="text-muted">Bal: ₹{txn.balance}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center', padding: '1rem' }}>No logged entries found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payment modal dialog popup */}
      {showPayModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Record Farmer Payment</h2>
              <button className="btn-close" onClick={() => setShowPayModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleRecordPaymentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Supplier Code*</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter supplier code"
                    value={payCode}
                    onChange={(e) => setPayCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)*</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Enter rupee amount"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-control"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks / Txn ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Bank Ref #12345"
                    value={payRemarks}
                    onChange={(e) => setPayRemarks(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
