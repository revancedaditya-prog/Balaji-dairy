import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Printer,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Phone,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { customerPaymentService } from '../../services/api';
import { PageHeader, SearchInput, Modal, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { generateCustomerWhatsAppText, openWhatsApp } from '../../utils/whatsapp';

const CustomerLedger = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [ledgerList, setLedgerList] = useState([]);
  const [summary, setSummary] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Individual statement modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  const fetchLedgers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerPaymentService.getLedgerList();
      if (res.success) {
        setLedgerList(res.data);
        setSummary(res.summary || {});
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch customer ledgers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  const villages = [...new Set(ledgerList.map((c) => c.village).filter(Boolean))];

  const filteredList = ledgerList.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      String(c.customerCode).includes(searchTerm) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.mobile && c.mobile.includes(searchTerm)) ||
      (c.village && c.village.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesVillage = !selectedVillage || c.village === selectedVillage;
    return matchesSearch && matchesVillage;
  });

  const handleOpenStatement = async (cust) => {
    setSelectedCustomer(cust);
    setStatementLoading(true);
    try {
      const res = await customerPaymentService.getCustomerLedger(cust.customerCode);
      if (res.success) {
        setStatementData(res);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load statement');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) return;
    const data = filteredList.map((c) => ({
      'Customer Code': c.customerCode,
      'Customer Name': c.customerName,
      Category: c.customerType,
      Village: c.village,
      Mobile: c.mobile,
      'Total Milk (L)': c.totalMilk,
      'Opening Balance (₹)': c.openingBalance,
      'Total Deliveries (₹)': c.totalSales,
      'Total Paid (₹)': c.totalPaid,
      'Total Adjustments (₹)': c.totalAdjusted,
      'Pending Due (₹)': c.pendingBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer_Ledger');
    XLSX.writeFile(wb, `Balaji_Customer_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported customer ledger to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Customer Ledger"
        hindiTitle="ग्राहक खाता बही"
        subtitle="Debit (milk deliveries) vs Credit (payments received) with running balance and statements."
        actions={
          <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Export Excel</span>
          </button>
        }
      />

      {/* KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Sales Accrued</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{(summary.totalSalesAll || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>Cumulative Customer Sales</div>
        </div>

        <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Payments Collected</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{(summary.totalCollectedAll || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16A34A' }}>Settled Cash Inward</div>
        </div>

        <div className="card" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C' }}>Total Pending Receivable</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{(summary.totalReceivable || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#DC2626' }}>Customer Outstanding Dues</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by code, customer name, mobile, or area..."
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-control"
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="">All Villages ({villages.length})</option>
              {villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Village</th>
                <th>Total Milk</th>
                <th>Opening Bal (₹)</th>
                <th>Sales (₹)</th>
                <th>Paid (₹)</th>
                <th>Pending Due (₹)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map((c) => (
                  <tr key={c.customerCode}>
                    <td>
                      <span className="badge badge-info font-mono-num">C#{c.customerCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {c.customerName}
                    </td>
                    <td>{c.village || '—'}</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">{c.totalMilk} L</td>
                    <td className="font-mono-num">₹{c.openingBalance}</td>
                    <td className="font-mono-num">₹{c.totalSales.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--color-success-text)', fontWeight: 700 }} className="font-mono-num">
                      ₹{c.totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontWeight: 800, color: c.pendingBalance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }} className="font-mono-num">
                      ₹{c.pendingBalance.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenStatement(c)}
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No customer ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Statement: C#${selectedCustomer.customerCode} ${selectedCustomer.customerName}`}
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
                    Current Due: ₹{statementData?.summary?.pendingBalance?.toLocaleString('en-IN')}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Mobile: {selectedCustomer.mobile || '—'} • Village: {selectedCustomer.village || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      const text = generateCustomerWhatsAppText({
                        customerName: selectedCustomer.customerName,
                        customerCode: selectedCustomer.customerCode,
                        billDate: new Date().toISOString().split('T')[0],
                        startDate: 'Start',
                        endDate: 'Today',
                        previousBalance: statementData?.summary?.openingBalance || 0,
                        totalLitres: statementData?.summary?.totalMilk || 0,
                        milkAmount: statementData?.summary?.totalSales || 0,
                        paymentsReceived: statementData?.summary?.totalPaid || 0,
                        adjustments: statementData?.summary?.totalAdjusted || 0,
                        finalPayable: statementData?.summary?.pendingBalance || 0,
                      });
                      openWhatsApp(selectedCustomer.mobile, text);
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
                      <th>Delivery (Dr)</th>
                      <th>Paid (Cr)</th>
                      <th>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData?.history?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '0.8rem' }}>{item.date}</td>
                        <td>
                          <span className={`badge ${item.txnType === 'debit' ? 'badge-info' : 'badge-success'}`}>
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

export default CustomerLedger;
