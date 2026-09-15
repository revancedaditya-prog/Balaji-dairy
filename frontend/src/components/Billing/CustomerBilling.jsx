import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Share2,
  Calendar,
  Save,
  CheckCircle2,
  Download,
  Eye,
  FileText
} from 'lucide-react';
import { billingService, customerService } from '../../services/api';
import { PageHeader, SearchInput, Modal, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { generateCustomerWhatsAppText, openWhatsApp } from '../../utils/whatsapp';

const CustomerBilling = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const todayStr = getISTDate();
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  // Bill Generator Form State
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [cycleType, setCycleType] = useState('Monthly'); // Daily, Weekly, 10-day, Monthly, Custom

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingBill, setSavingBill] = useState(false);

  // Invoices History
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Selected Invoice Print Modal
  const [selectedBillForPrint, setSelectedBillForPrint] = useState(null);

  const fetchBillsHistory = useCallback(async () => {
    try {
      setLoadingBills(true);
      const res = await billingService.getBills();
      if (res.success) {
        setBills(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBills(false);
    }
  }, []);

  useEffect(() => {
    fetchBillsHistory();
  }, [fetchBillsHistory]);

  // Lookup customer name when code changes
  useEffect(() => {
    const codeNum = parseInt(customerCode, 10);
    if (!codeNum || isNaN(codeNum)) {
      setCustomerName('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await customerService.getCustomers({ search: codeNum });
        if (res.success && res.data && res.data.length > 0) {
          const match = res.data.find((c) => c.customerCode === codeNum);
          if (match) setCustomerName(match.customerName);
          else setCustomerName('');
        }
      } catch {
        setCustomerName('');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [customerCode]);

  // Quick cycle presets
  const handleCycleChange = (type) => {
    setCycleType(type);
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    if (type === 'Daily') {
      setStartDate(todayISO);
      setEndDate(todayISO);
    } else if (type === 'Weekly') {
      const prev7 = new Date();
      prev7.setDate(today.getDate() - 7);
      setStartDate(prev7.toISOString().split('T')[0]);
      setEndDate(todayISO);
    } else if (type === '10-day') {
      const prev10 = new Date();
      prev10.setDate(today.getDate() - 10);
      setStartDate(prev10.toISOString().split('T')[0]);
      setEndDate(todayISO);
    } else if (type === 'Monthly') {
      setStartDate(todayISO.substring(0, 7) + '-01');
      setEndDate(todayISO);
    }
  };

  // Generate / Preview Bill
  const handleCalculateBill = async (e) => {
    if (e) e.preventDefault();
    const codeNum = parseInt(customerCode, 10);
    if (!codeNum) {
      showWarning('Please enter a valid Customer Code');
      return;
    }
    if (!startDate || !endDate) {
      showWarning('Please select valid billing date range');
      return;
    }

    try {
      setLoadingPreview(true);
      const res = await billingService.previewBill({
        customerCode: codeNum,
        startDate,
        endDate,
      });
      if (res.success) {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Failed to calculate bill');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Save Bill
  const handleSaveBill = async () => {
    if (!previewData) return;
    try {
      setSavingBill(true);
      const res = await billingService.saveBill(previewData);
      if (res.success) {
        showSuccess(`Invoice #${previewData.billNumber} saved successfully!`);
        fetchBillsHistory();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save bill');
    } finally {
      setSavingBill(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Customer Billing & Invoices"
        hindiTitle="ग्राहक बिल व रसीद"
        subtitle="Generate period bills (Daily, Weekly, 10-day, Monthly), printable invoices, and WhatsApp statements."
      />

      {/* Bill Generator Card */}
      <div className="card" style={{ border: '2px solid var(--color-accent-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #E6CA65 0%, #D4AF37 100%)', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                GENERATE CUSTOMER INVOICE
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Select customer and date range to calculate deliveries and pending dues
              </span>
            </div>
          </div>

          {/* Billing Cycle Preset Chips */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['Daily', 'Weekly', '10-day', 'Monthly', 'Custom'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCycleChange(c)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${cycleType === c ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: cycleType === c ? 'var(--color-accent-light)' : 'var(--color-surface)',
                  color: cycleType === c ? '#92400E' : 'var(--color-text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCalculateBill}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Customer Code <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                className="form-control font-mono-num"
                placeholder="e.g. 1"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                required
              />
              {customerName && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> {customerName}
                </span>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Period Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Period End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <button
                type="submit"
                className="btn btn-accent btn-lg"
                style={{ width: '100%', fontWeight: 800 }}
                disabled={loadingPreview}
              >
                {loadingPreview ? 'Calculating...' : 'Calculate & Preview Bill'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Generated Bill Preview Card */}
      {previewData && (
        <div className="card" style={{ border: '2px solid #0F172A', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: '0.25rem' }}>
                {previewData.billNumber}
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                {previewData.customerName} (C#{previewData.customerCode})
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Billing Period: {previewData.startDate} to {previewData.endDate} • Generated on {previewData.billDate}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => {
                  const text = generateCustomerWhatsAppText({
                    customerName: previewData.customerName,
                    customerCode: previewData.customerCode,
                    billDate: previewData.billDate,
                    startDate: previewData.startDate,
                    endDate: previewData.endDate,
                    previousBalance: previewData.previousBalance,
                    totalLitres: previewData.totalLitres,
                    milkAmount: previewData.milkAmount,
                    paymentsReceived: previewData.paymentsReceived,
                    adjustments: previewData.adjustments,
                    finalPayable: previewData.finalPayable,
                  });
                  openWhatsApp(previewData.mobile, text);
                }}
                className="btn btn-success btn-sm"
              >
                <Share2 size={14} />
                <span>Share WhatsApp</span>
              </button>
              <button
                onClick={() => setSelectedBillForPrint(previewData)}
                className="btn btn-secondary btn-sm"
              >
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>
              <button
                onClick={handleSaveBill}
                disabled={savingBill}
                className="btn btn-primary btn-sm"
              >
                <Save size={14} />
                <span>{savingBill ? 'Saving...' : 'Save Invoice'}</span>
              </button>
            </div>
          </div>

          {/* Summary Math Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>1. Previous Balance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }} className="font-mono-num">
                ₹{previewData.previousBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <div style={{ fontSize: '0.725rem', color: '#0369A1', fontWeight: 600 }}>2. Milk Delivered</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                {previewData.totalLitres} L
              </div>
              <div style={{ fontSize: '0.725rem', color: '#0284C7' }}>₹{previewData.milkAmount.toLocaleString('en-IN')}</div>
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '0.725rem', color: '#15803D', fontWeight: 600 }}>3. Payments Received</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
                - ₹{previewData.paymentsReceived.toLocaleString('en-IN')}
              </div>
              {previewData.adjustments > 0 && <div style={{ fontSize: '0.7rem', color: '#16A34A' }}>+ ₹{previewData.adjustments} Adj</div>}
            </div>

            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FFF8E7', border: '2px solid #D4AF37' }}>
              <div style={{ fontSize: '0.725rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>4. Final Net Payable</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                ₹{previewData.finalPayable.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Period Delivery Items Table */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Period Milk Deliveries Breakdown ({previewData.deliveries?.length || 0} Records)
            </h4>
            <div className="table-responsive" style={{ maxHeight: '40vh' }}>
              <table className="dairy-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Quantity (L)</th>
                    <th>Rate (₹/L)</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.deliveries?.map((d, idx) => (
                    <tr key={idx}>
                      <td>{d.date}</td>
                      <td>{d.shift}</td>
                      <td style={{ fontWeight: 700 }} className="font-mono-num">{d.quantity} L</td>
                      <td className="font-mono-num">₹{d.rate}</td>
                      <td style={{ fontWeight: 800 }} className="font-mono-num">₹{d.amount}</td>
                      <td>
                        <StatusBadge status={d.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Saved Invoices History */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Saved Customer Invoices ({bills.length})
          </h3>
        </div>

        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Bill Date</th>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Period</th>
                <th>Milk (L)</th>
                <th>Final Payable (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <span className="badge badge-gold font-mono-num">{b.billNumber}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{b.billDate}</td>
                    <td>
                      <span className="badge badge-info font-mono-num">C#{b.customerCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{b.customerName}</td>
                    <td style={{ fontSize: '0.8rem' }}>{b.startDate} to {b.endDate}</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">{b.totalLitres} L</td>
                    <td style={{ fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                      ₹{b.finalPayable.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedBillForPrint(b)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Printer size={13} />
                        <span>Print Bill</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                    No saved invoices yet. Generate a bill above and click "Save Invoice".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedBillForPrint && (
        <div className="modal-overlay" onClick={() => setSelectedBillForPrint(null)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>Customer Milk Invoice</h3>
              <button onClick={() => setSelectedBillForPrint(null)} className="btn-icon-sm btn-ghost">✕</button>
            </div>

            <div className="modal-body">
              <div
                id="printable-bill"
                style={{
                  padding: '2rem',
                  border: '1.5px solid #0F172A',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                }}
              >
                {/* Invoice Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: '#0F172A' }}>
                      BALAJI DAIRY
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontWeight: 600, fontSize: '0.85rem' }}>
                      श्री बालाजी डेयरी • Pure Milk & Dairy Products
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#555' }}>
                      Daily Route Milk Supply & Billing Center
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>TAX / MILK INVOICE</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{selectedBillForPrint.billNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#555' }}>Date: {selectedBillForPrint.billDate}</div>
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>BILLED TO:</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                      {selectedBillForPrint.customerName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                      Customer Code: <strong>C#{selectedBillForPrint.customerCode}</strong>
                    </div>
                    {selectedBillForPrint.village && (
                      <div style={{ fontSize: '0.8rem', color: '#334155' }}>Village / Area: {selectedBillForPrint.village}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>BILLING PERIOD:</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      {selectedBillForPrint.startDate} to {selectedBillForPrint.endDate}
                    </div>
                  </div>
                </div>

                {/* Table Breakdown */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>Total Quantity</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '0.65rem' }}>
                        <strong>Fresh Milk Supply</strong>
                        <div style={{ fontSize: '0.75rem', color: '#555' }}>Period deliveries ({selectedBillForPrint.startDate} to {selectedBillForPrint.endDate})</div>
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'center', fontWeight: 700 }}>
                        {selectedBillForPrint.totalLitres} Litres
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 700 }}>
                        ₹{selectedBillForPrint.milkAmount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Calculation Table */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                  <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Previous Pending Balance:</span>
                      <span>₹{selectedBillForPrint.previousBalance?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Current Milk Charges:</span>
                      <span>+ ₹{selectedBillForPrint.milkAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                      <span>Payments Received:</span>
                      <span>- ₹{selectedBillForPrint.paymentsReceived?.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedBillForPrint.adjustments > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                        <span>Discounts / Adjustments:</span>
                        <span>- ₹{selectedBillForPrint.adjustments?.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <hr style={{ border: 'none', borderTop: '2px solid #0F172A', margin: '0.35rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900, color: '#0F172A' }}>
                      <span>FINAL PAYABLE:</span>
                      <span>₹{selectedBillForPrint.finalPayable?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #CBD5E1', fontSize: '0.8rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '30px' }} />
                    <div style={{ borderTop: '1px dashed #555', width: '160px', paddingTop: '4px' }}>Customer Signature</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '30px' }} />
                    <div style={{ borderTop: '1px dashed #555', width: '160px', paddingTop: '4px' }}>For BALAJI DAIRY</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedBillForPrint(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerBilling;
