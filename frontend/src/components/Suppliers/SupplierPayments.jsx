import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { paymentService, supplierService } from '../../services/api';
import { PageHeader, SearchInput, Modal } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const SupplierPayments = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Record Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments();
      if (res.success) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch supplier payments');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const codeNum = parseInt(supplierCode, 10);
    const amt = parseFloat(amountPaid);

    if (!codeNum || isNaN(codeNum)) {
      showWarning('Please enter a valid Supplier Code');
      return;
    }
    if (!amt || amt <= 0) {
      showWarning('Please enter a valid payment amount');
      return;
    }

    try {
      const res = await paymentService.recordPayment({
        supplierCode: codeNum,
        amountPaid: amt,
        paymentMode,
        remarks,
        date: paymentDate,
      });

      if (res.success) {
        showSuccess(`Recorded payment of ₹${amt} to #${codeNum} ${supplierName || ''}`);
        setShowModal(false);
        setSupplierCode('');
        setSupplierName('');
        setAmountPaid('');
        setRemarks('');
        fetchPayments();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const filteredPayments = payments.filter((p) => {
    return (
      !searchTerm ||
      String(p.supplierCode).includes(searchTerm) ||
      (p.remarks && p.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.paymentMode && p.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalDisbursed = Math.round(payments.reduce((sum, p) => sum + p.amountPaid, 0) * 100) / 100;

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) return;
    const data = filteredPayments.map((p) => ({
      'Supplier Code': p.supplierCode,
      Date: p.date,
      'Amount Paid (₹)': p.amountPaid,
      'Payment Mode': p.paymentMode,
      Remarks: p.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Farmer_Payments');
    XLSX.writeFile(wb, `Balaji_Farmer_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported payments to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Supplier Payments"
        hindiTitle="किसान भुगतान रजिस्टर"
        subtitle="Disburse and track milk payments settled to farmers via Cash, Bank Transfer, or Cheque."
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
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Payments Disbursed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>{payments.length} Settlements Recorded</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by supplier code, payment mode, or remarks..."
        />
      </div>

      {/* Payments History Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier Code</th>
                <th>Amount Paid (₹)</th>
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
                      <span className="badge badge-gold font-mono-num">#{p.supplierCode}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                      ₹{p.amountPaid.toLocaleString('en-IN')}
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
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No payment records found.
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
        title="Record Supplier Payment"
      >
        <form onSubmit={handleRecordPayment}>
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
              <span style={{ fontSize: '0.775rem', color: 'var(--color-success-text)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={13} /> {supplierName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Payment Date</label>
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
              min="1"
              className="form-control font-mono-num"
              style={{ fontSize: '1.2rem', fontWeight: 800 }}
              placeholder="₹ Amount"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
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
              <option value="Bank Transfer">Bank Transfer (खाता ट्रांसफर)</option>
              <option value="Cheque">Cheque (चेक)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Weekly settlement or advance"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" style={{ minWidth: '140px' }}>
              Confirm & Disburse
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierPayments;
