import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/api';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Modal, EmptyState, Loading } from '../Common/MaterialComponents';

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
  const [showTimelineModal, setShowTimelineModal] = useState(false); // Mobile-friendly timeline bottom sheet trigger

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

  // Trigger history modal on mobile
  const handleOpenMobileHistory = (code, e) => {
    e.stopPropagation();
    loadSupplierDetailedLedger(code);
    setShowTimelineModal(true);
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
    <div className="payments-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      {success && <div className="success-alert" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Filters Card */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
          <Input
            label="Search Farmer"
            type="text"
            placeholder="Type code or farmer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            label="Filter by Village"
            type="text"
            placeholder="Enter village..."
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={exportLedgerExcel} style={{ minHeight: '40px' }}>Export Ledger</Button>
          <Button variant="primary" className="desktop-only" onClick={() => setShowPayModal(true)} style={{ minHeight: '40px' }}>Record Payment</Button>
        </div>
      </Card>

      {/* Floating Action Button for recording payments on mobile */}
      <button 
        className="fab-md3 mobile-only" 
        onClick={() => setShowPayModal(true)}
        aria-label="Record Payment"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M12 14v4"/><path d="M10 16h4"/></svg>
      </button>

      {/* Main Ledger Dashboard layout */}
      <div className="grid grid-cols-3" style={{ gap: '1rem', alignItems: 'start' }}>
        
        {/* Ledger Table List (2 columns width on desktop if detail page open, else 3 cols) */}
        <div style={{ gridColumn: (detailedLedger && !showTimelineModal) ? 'span 2' : 'span 3' }}>
          
          {/* Desktop Table view */}
          <Card className="desktop-only" style={{ padding: '1rem' }}>
            <div className="table-container">
              {loading ? (
                <Loading label="Filtering ledger balances..." />
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
                          <td style={{ color: 'var(--md-sys-color-success)', fontWeight: '500' }}>₹{item.totalPaid}</td>
                          <td style={{
                            fontWeight: '600',
                            color: item.pendingAmount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-success)'
                          }}>
                            ₹{item.pendingAmount}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="outlined"
                              style={{ padding: '0.2rem 0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPayCode(item.supplierCode.toString());
                                setShowPayModal(true);
                              }}
                            >
                              Pay
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                          No farmers registered or matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Mobile Cards list (Android-first responsive layout) */}
          <div className="mobile-card-list mobile-only">
            {loading ? (
              <Loading label="Filtering ledger balances..." />
            ) : ledgerList.length > 0 ? (
              ledgerList.map((item) => (
                <div key={item.supplierCode} className="mobile-row-card" onClick={(e) => handleOpenMobileHistory(item.supplierCode, e)}>
                  <div className="mobile-row-card-header">
                    <div className="mobile-row-card-title">
                      <Badge type="primary" style={{ marginRight: '0.5rem' }}>#{item.supplierCode}</Badge>
                      {item.supplierName}
                    </div>
                    <Badge type={item.pendingAmount > 0 ? 'error' : 'success'}>
                      {item.pendingAmount > 0 ? 'Pending' : 'Settled'}
                    </Badge>
                  </div>
                  <div className="mobile-row-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Village:</span>
                      <span>{item.village}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Total Milk Volume:</span>
                      <span>{item.totalMilk} Liters</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Earnings (Due):</span>
                      <span>₹{item.totalAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Total Paid:</span>
                      <span style={{ color: 'var(--md-sys-color-success)', fontWeight: '500' }}>₹{item.totalPaid}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', borderTop: '1px dashed var(--md-sys-color-surface-variant)', paddingTop: '0.25rem' }}>
                      <span style={{ fontWeight: '600' }}>Pending Balance:</span>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        color: item.pendingAmount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-success)'
                      }}>
                        ₹{item.pendingAmount}
                      </span>
                    </div>
                  </div>
                  <div className="mobile-row-card-actions">
                    <Button
                      variant="outlined"
                      style={{ padding: '0.25rem 0.75rem', minHeight: '36px', fontSize: '0.8rem', marginRight: '0.5rem' }}
                      onClick={(e) => handleOpenMobileHistory(item.supplierCode, e)}
                    >
                      History
                    </Button>
                    <Button
                      variant="primary"
                      style={{ padding: '0.25rem 0.75rem', minHeight: '36px', fontSize: '0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPayCode(item.supplierCode.toString());
                        setShowPayModal(true);
                      }}
                    >
                      Record Pay
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No billing balance records match search criteria" />
            )}
          </div>
        </div>

        {/* Detailed Transactions ledger (Desktop Sidebar View) */}
        {detailedLedger && !showTimelineModal && (
          <Card style={{ gridColumn: 'span 1' }} className="desktop-only">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--md-sys-color-surface-variant)', paddingBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem' }}>{detailedLedger.supplier.supplierName}</h3>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Code: #{detailedLedger.supplier.supplierCode} | {detailedLedger.supplier.village}</span>
              </div>
              <button className="btn-close" onClick={() => setDetailedLedger(null)}>&times;</button>
            </div>

            {loadingDetailed ? (
              <Loading label="Compiling timeline ledger..." />
            ) : (
              <div>
                {/* Micro summary */}
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 'var(--md-shape-corner-medium)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Total Due:</span>
                    <span style={{ fontWeight: '600' }}>₹{detailedLedger.summary.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Paid:</span>
                    <span style={{ color: 'var(--md-sys-color-success)', fontWeight: '600' }}>₹{detailedLedger.summary.totalPaid}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: '700' }}>
                    <span>Balance:</span>
                    <span style={{ color: detailedLedger.summary.pendingAmount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-success)' }}>
                      ₹{detailedLedger.summary.pendingAmount}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '600' }}>Chronological History</h4>
                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {detailedLedger.history.length > 0 ? (
                    detailedLedger.history.map((txn, idx) => (
                      <div key={idx} style={{
                        borderLeft: `2px solid ${txn.txnType === 'debit' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-success)'}`,
                        paddingLeft: '0.75rem',
                        marginBottom: '0.75rem',
                        position: 'relative',
                        paddingBottom: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                          <span>{txn.type}</span>
                          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{txn.date}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', margin: '0.15rem 0' }}>{txn.description}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                          <span style={{ color: txn.txnType === 'debit' ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-success)' }}>
                            {txn.txnType === 'debit' ? '+' : '-'} ₹{txn.amount}
                          </span>
                          <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Bal: ₹{txn.balance}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', padding: '1rem' }}>No logged entries found.</div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Chronological History timeline (Mobile Bottom Sheet Modal) */}
      <Modal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setDetailedLedger(null);
        }}
        title={detailedLedger ? `Ledger: ${detailedLedger.supplier.supplierName}` : 'Farmer Ledger Statement'}
      >
        {loadingDetailed ? (
          <Loading label="Compiling transaction history..." />
        ) : detailedLedger ? (
          <div>
            {/* Summary */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--md-sys-color-surface-variant)', borderRadius: 'var(--md-shape-corner-medium)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Code / Village:</span>
                <span style={{ fontWeight: '500' }}>#{detailedLedger.supplier.supplierCode} • {detailedLedger.supplier.village}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Total Due:</span>
                <span style={{ fontWeight: '600' }}>₹{detailedLedger.summary.totalAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Paid:</span>
                <span style={{ color: 'var(--md-sys-color-success)', fontWeight: '600' }}>₹{detailedLedger.summary.totalPaid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: '700' }}>
                <span>Balance:</span>
                <span style={{ color: detailedLedger.summary.pendingAmount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-success)' }}>
                  ₹{detailedLedger.summary.pendingAmount}
                </span>
              </div>
            </div>

            {/* Transactions Timeline */}
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '600' }}>Transactions Trail</h4>
            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {detailedLedger.history.length > 0 ? (
                detailedLedger.history.map((txn, idx) => (
                  <div key={idx} style={{
                    borderLeft: `3px solid ${txn.txnType === 'debit' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-success)'}`,
                    paddingLeft: '0.75rem',
                    marginBottom: '0.75rem',
                    position: 'relative',
                    paddingBottom: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                      <span>{txn.type}</span>
                      <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{txn.date}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', margin: '0.15rem 0' }}>{txn.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                      <span style={{ color: txn.txnType === 'debit' ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-success)' }}>
                        {txn.txnType === 'debit' ? '+' : '-'} ₹{txn.amount}
                      </span>
                      <span style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Bal: ₹{txn.balance}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', padding: '1rem' }}>No transaction history found.</div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState message="Failed to load ledger history" />
        )}
      </Modal>

      {/* Record Payment Receipt Modal Form Dialog */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Record Farmer Payment"
      >
        <form onSubmit={handleRecordPaymentSubmit}>
          <Input
            label="Supplier Code*"
            type="number"
            inputMode="numeric"
            placeholder="Enter supplier code"
            value={payCode}
            onChange={(e) => setPayCode(e.target.value)}
            required
          />
          <Input
            label="Amount Paid (₹)*"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Enter payment amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />
          <Input
            label="Payment Date"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
          <div className="form-group">
            <label className="input-md3-label">Payment Mode</label>
            <select
              className="input-md3-control"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <Input
            label="Remarks / Transaction ID"
            type="text"
            placeholder="e.g. Bank Ref #12345"
            value={payRemarks}
            onChange={(e) => setPayRemarks(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="outlined" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Payment</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Payments;
