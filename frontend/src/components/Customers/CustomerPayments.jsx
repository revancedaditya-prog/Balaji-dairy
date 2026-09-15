import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { customerPaymentService, customerService } from '../../services/api';
import { PageHeader, SearchInput, Modal } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const CustomerPayments = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Record Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [discountOrAdjustment, setDiscountOrAdjustment] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerPaymentService.getPayments();
      if (res.success) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch customer payments history');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const codeNum = parseInt(customerCode, 10);
    const amt = parseFloat(amountPaid) || 0;
    const adj = parseFloat(discountOrAdjustment) || 0;

    if (!codeNum || isNaN(codeNum)) {
      showWarning('Please enter a valid Customer Code');
      return;
    }
    if (amt <= 0 && adj <= 0) {
      showWarning('Please enter a valid payment or adjustment amount');
      return;
    }

    try {
      const res = await customerPaymentService.recordPayment({
        customerCode: codeNum,
        amountPaid: amt,
        discountOrAdjustment: adj,
        paymentMode,
        remarks,
        date: paymentDate,
      });

      if (res.success) {
        showSuccess(`Recorded receipt of ₹${amt} from C#${codeNum} ${customerName || ''}`);
        setShowModal(false);
        setCustomerCode('');
        setCustomerName('');
        setAmountPaid('');
        setDiscountOrAdjustment('');
        setRemarks('');
        fetchPayments();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record customer payment');
    }
  };

  const filteredPayments = payments.filter((p) => {
    return (
      !searchTerm ||
      String(p.customerCode).includes(searchTerm) ||
      p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.remarks && p.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalCollected = Math.round(payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0) * 100) / 100;
  const totalAdjustments = Math.round(payments.reduce((sum, p) => sum + (p.discountOrAdjustment || 0), 0) * 100) / 100;

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) return;
    const data = filteredPayments.map((p) => ({
      'Customer Code': p.customerCode,
      'Customer Name': p.customerName,
      Date: p.date,
      'Amount Paid (₹)': p.amountPaid,
      'Discount / Adj (₹)': p.discountOrAdjustment,
      'Payment Mode': p.paymentMode,
      Remarks: p.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Receipts');
    XLSX.writeFile(wb, `Balaji_Customer_Receipts_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported customer receipts to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Customer Payments"
        hindiTitle="ग्राहक भुगतान रसीद"
        subtitle="Record payments received from customers via Cash, UPI, Bank Transfer, or Cheque."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Record Payment</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Payments Collected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>{payments.length} Receipts Recorded</div>
        </div>

        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Discounts / Adjustments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalAdjustments.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>Rebates / Round-off</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by customer code, name, payment mode, or remarks..."
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Amount Paid (₹)</th>
                <th>Discount / Adj</th>
                <th>Payment Mode</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontSize: '0.825rem' }}>{p.date}</td>
                    <td>
                      <span className="badge badge-info font-mono-num">C#{p.customerCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {p.customerName}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                      ₹{p.amountPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="font-mono-num">
                      {p.discountOrAdjustment > 0 ? `₹${p.discountOrAdjustment}` : '—'}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{p.paymentMode}</span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                      {p.remarks || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No customer payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Customer Payment"
      >
        <form onSubmit={handleRecordPayment}>
          <div className="form-group">
            <label className="form-label">Customer Code <span className="required">*</span></label>
            <input
              type="number"
              min="1"
              className="form-control font-mono-num"
              placeholder="e.g. 1"
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              required
              autoFocus
            />
            {customerName && (
              <span style={{ fontSize: '0.775rem', color: 'var(--color-success-text)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={13} /> {customerName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount Paid (₹) <span className="required">*</span></label>
            <input
              type="number"
              step="1"
              min="0"
              className="form-control font-mono-num"
              style={{ fontSize: '1.2rem', fontWeight: 800 }}
              placeholder="₹ Paid"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Discount / Round-off Adjustment (₹)</label>
            <input
              type="number"
              step="1"
              min="0"
              className="form-control font-mono-num"
              placeholder="0"
              value={discountOrAdjustment}
              onChange={(e) => setDiscountOrAdjustment(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-control"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="Cash">Cash (नकद)</option>
              <option value="UPI / Online">UPI / PhonePe / GPay</option>
              <option value="Bank Transfer">Bank Transfer (बैंक)</option>
              <option value="Cheque">Cheque (चेक)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Reference</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. UTR / Transaction No."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" style={{ minWidth: '140px' }}>
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerPayments;
