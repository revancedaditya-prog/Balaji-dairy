import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  Trash2,
  Calendar,
  PieChart,
  Receipt,
  TrendingDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { expenseService } from '../../services/api';
import { PageHeader, SearchInput, Modal, ConfirmationDialog, Currency } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';

const Expenses = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ todayExpenses: 0, monthlyExpenses: 0, categoryBreakdown: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Add Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: getISTDate(),
    category: 'LPG',
    amount: '',
    paymentMode: 'Cash',
    description: '',
    billReference: '',
  });

  const [deleteId, setDeleteId] = useState(null);

  const categories = [
    'LPG',
    'Electricity',
    'Diesel',
    'Transport',
    'Labour',
    'Repairs',
    'Packaging',
    'Cleaning',
    'Milk Testing',
    'Maintenance',
    'Miscellaneous',
  ];

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getExpenseStats(),
      ]);
      if (listRes.success) setExpenses(listRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      showError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) {
      showWarning('Please enter a valid expense amount');
      return;
    }

    try {
      const res = await expenseService.addExpense({
        ...formData,
        amount: amt,
      });
      if (res.success) {
        showSuccess(`Logged expense of ₹${amt} for ${formData.category}`);
        setShowModal(false);
        setFormData({
          date: getISTDate(),
          category: 'LPG',
          amount: '',
          paymentMode: 'Cash',
          description: '',
          billReference: '',
        });
        fetchExpenses();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await expenseService.deleteExpense(deleteId);
      if (res.success) {
        showSuccess('Expense deleted');
        setDeleteId(null);
        fetchExpenses();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.billReference && e.billReference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) return;
    const data = filteredExpenses.map((e) => ({
      Date: e.date,
      Category: e.category,
      'Amount (₹)': e.amount,
      'Payment Mode': e.paymentMode,
      Description: e.description || '',
      'Bill Reference': e.billReference || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dairy_Expenses');
    XLSX.writeFile(wb, `Balaji_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported expenses to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Expense Management"
        hindiTitle="डेयरी खर्च प्रबंधन"
        subtitle="Track operating overheads (LPG, electricity, transport, labour, packaging, maintenance)."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Add Expense</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E' }}>Today's Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{stats.todayExpenses.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#B45309' }}>Daily Overheads</div>
        </div>

        <div className="card" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C' }}>Monthly Operating Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{stats.monthlyExpenses.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#DC2626' }}>Current Month Cumulative</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search expenses by category, description, or bill #..."
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Payment Mode</th>
                <th>Description</th>
                <th>Bill Reference</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontSize: '0.825rem' }}>{item.date}</td>
                    <td>
                      <span className="badge badge-gold" style={{ fontWeight: 700 }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-danger-text)' }} className="font-mono-num">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{item.paymentMode}</span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                      {item.billReference || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setDeleteId(item._id)}
                        className="btn-icon-sm btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete Expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No expense records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Record Dairy Expense"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Expense Category <span className="required">*</span></label>
            <select
              className="form-control"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Expense Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹) <span className="required">*</span></label>
            <input
              type="number"
              step="1"
              min="1"
              className="form-control font-mono-num"
              style={{ fontSize: '1.2rem', fontWeight: 800 }}
              placeholder="₹ Amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <select
              className="form-control"
              value={formData.paymentMode}
              onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
            >
              <option value="Cash">Cash (नकद)</option>
              <option value="UPI / Online">UPI / Online Transfer</option>
              <option value="Bank Transfer">Bank Transfer (खाता)</option>
              <option value="Cheque">Cheque (चेक)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Item Details</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 2 Commercial LPG Cylinders for Paneer boiler"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bill / Invoice Reference Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Inv #8492 or Vendor Name"
              value={formData.billReference}
              onChange={(e) => setFormData({ ...formData, billReference: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense entry?"
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
};

export default Expenses;
