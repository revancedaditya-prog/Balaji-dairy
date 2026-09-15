import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Printer,
  CreditCard,
  Users,
  ArrowRight,
  TrendingDown,
  Phone,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { paymentService } from '../../services/api';
import { PageHeader, SearchInput, Modal, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { generateSupplierWhatsAppText, openWhatsApp } from '../../utils/whatsapp';

const SupplierLedger = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [ledgerList, setLedgerList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected supplier statement modal
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const fetchLedgers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentService.getLedger();
      if (res.success) {
        setLedgerList(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch supplier ledger summaries');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  const filteredList = ledgerList.filter((s) => {
    return (
      !searchTerm ||
      String(s.supplierCode).includes(searchTerm) ||
      s.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.village && s.village.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.mobile && s.mobile.includes(searchTerm))
    );
  });

  // Calculate totals
  const totalMilkAll = Math.round(ledgerList.reduce((sum, s) => sum + s.totalMilk, 0) * 100) / 100;
  const totalPurchasesAll = Math.round(ledgerList.reduce((sum, s) => sum + s.totalAmount, 0) * 100) / 100;
  const totalPaidAll = Math.round(ledgerList.reduce((sum, s) => sum + s.totalPaid, 0) * 100) / 100;
  const totalPayableAll = Math.round(ledgerList.reduce((sum, s) => sum + s.pendingAmount, 0) * 100) / 100;

  const handleOpenStatement = async (sup) => {
    setSelectedSupplier(sup);
    setStatementLoading(true);
    try {
      const res = await paymentService.getSupplierLedger(sup.supplierCode);
      if (res.success) {
        setStatementData(res);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load statement history');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) return;
    const data = filteredList.map((s) => ({
      'Supplier Code': s.supplierCode,
      'Farmer Name': s.supplierName,
      Village: s.village,
      Mobile: s.mobile,
      'Total Milk (L)': s.totalMilk,
      'Total Milk Value (₹)': s.totalAmount,
      'Total Paid (₹)': s.totalPaid,
      'Pending Balance (₹)': s.pendingAmount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier_Ledger');
    XLSX.writeFile(wb, `Balaji_Supplier_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported supplier ledger to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Supplier Ledger"
        hindiTitle="किसान खाता बही"
        subtitle="Credit (milk purchase) vs Debit (payments settlement) with running balance and statements."
        actions={
          <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Export Excel</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
        <div className="card" style={{ background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E' }}>Total Milk Purchased</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {totalMilkAll.toLocaleString('en-IN')} L
          </div>
          <div style={{ fontSize: '0.725rem', color: '#B45309' }}>Cumulative Inward</div>
        </div>

        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Milk Purchase Cost</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalPurchasesAll.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>Total Payable Accrued</div>
        </div>

        <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Payments Settled</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalPaidAll.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>Disbursed to Farmers</div>
        </div>

        <div className="card" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C' }}>Current Outstanding Payable</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalPayableAll.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#DC2626' }}>Pending Settlement</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by code, farmer name, village, or phone..."
        />
      </div>

      {/* Ledger Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Farmer Name</th>
                <th>Village</th>
                <th>Total Milk (L)</th>
                <th>Total Value (₹)</th>
                <th>Paid (₹)</th>
                <th>Pending Balance (₹)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map((s) => (
                  <tr key={s.supplierCode}>
                    <td>
                      <span className="badge badge-gold font-mono-num">#{s.supplierCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {s.supplierName}
                    </td>
                    <td>{s.village || '—'}</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">
                      {s.totalMilk} L
                    </td>
                    <td className="font-mono-num">₹{s.totalAmount.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--color-success-text)', fontWeight: 700 }} className="font-mono-num">
                      ₹{s.totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 800, color: s.pendingAmount > 0 ? 'var(--color-danger-text)' : 'var(--color-text-main)' }} className="font-mono-num">
                      ₹{s.pendingAmount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenStatement(s)}
                        className="btn btn-secondary btn-sm"
                      >
                        <span>Statement</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No ledger records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement Modal */}
      {selectedSupplier && (
        <Modal
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          title={`Statement: #${selectedSupplier.supplierCode} ${selectedSupplier.supplierName}`}
          size="xl"
        >
          {statementLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner spinner-gold" style={{ margin: '0 auto 1rem auto' }} />
              <p>Loading chronological statement...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* WhatsApp and Print actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>
                    Pending Balance: ₹{statementData?.summary?.pendingAmount?.toLocaleString('en-IN')}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Village: {selectedSupplier.village || '—'} • Mobile: {selectedSupplier.mobile || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      const text = generateSupplierWhatsAppText({
                        supplierName: selectedSupplier.supplierName,
                        supplierCode: selectedSupplier.supplierCode,
                        date: new Date().toISOString().split('T')[0],
                        totalMilk: statementData?.summary?.totalMilk || 0,
                        totalAmount: statementData?.summary?.totalAmount || 0,
                        totalPaid: statementData?.summary?.totalPaid || 0,
                        pendingAmount: statementData?.summary?.pendingAmount || 0,
                      });
                      openWhatsApp(selectedSupplier.mobile, text);
                    }}
                    className="btn btn-success btn-sm"
                  >
                    <span>Share on WhatsApp</span>
                  </button>
                  <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                    <Printer size={14} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '50vh' }}>
                <table className="dairy-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Type</th>
                      <th>Description</th>
                      <th>Purchase (Cr)</th>
                      <th>Paid (Dr)</th>
                      <th>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData?.history?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '0.8rem' }}>{item.date}</td>
                        <td>
                          <span className={`badge ${item.txnType === 'debit' ? 'badge-gold' : 'badge-success'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>{item.description}</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }} className="font-mono-num">
                          {item.txnType === 'debit' ? `₹${item.amount}` : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--color-success-text)' }} className="font-mono-num">
                          {item.txnType === 'credit' ? `₹${item.amount}` : '—'}
                        </td>
                        <td style={{ fontWeight: 800 }} className="font-mono-num">
                          ₹{item.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SupplierLedger;
