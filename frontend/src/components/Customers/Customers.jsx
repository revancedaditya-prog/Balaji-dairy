import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Receipt,
  BookOpen,
  CheckCircle2,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { customerService, customerPaymentService, deliveryService } from '../../services/api';
import { PageHeader, SearchInput, Modal, ConfirmationDialog, StatusBadge, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';
import { generateCustomerWhatsAppText, openWhatsApp } from '../../utils/whatsapp';

const Customers = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    mobile: '',
    address: '',
    village: '',
    customerType: 'Household',
    milkType: 'Mixed',
    morningDefaultQty: 1,
    eveningDefaultQty: 0,
    defaultRate: 60,
    billingCycle: 'Monthly',
    openingBalance: 0,
    notes: '',
  });

  // 360° Profile Modal
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLedger, setProfileLedger] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Delete Dialog
  const [deleteId, setDeleteId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers();
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch customer list');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      String(c.customerCode).includes(searchTerm) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.mobile && c.mobile.includes(searchTerm)) ||
      (c.village && c.village.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = !selectedType || c.customerType === selectedType;
    const matchesVillage = !selectedVillage || c.village === selectedVillage;

    return matchesSearch && matchesType && matchesVillage;
  });

  const villages = [...new Set(customers.map((c) => c.village).filter(Boolean))];

  // Open Add Modal
  const handleOpenAdd = async () => {
    setEditingCustomer(null);
    try {
      const codeRes = await customerService.getNextCode();
      setFormData({
        customerCode: codeRes.nextCode || 1,
        customerName: '',
        mobile: '',
        address: '',
        village: villages[0] || '',
        customerType: 'Household',
        milkType: 'Mixed',
        morningDefaultQty: 1,
        eveningDefaultQty: 0,
        defaultRate: 60,
        billingCycle: 'Monthly',
        openingBalance: 0,
        notes: '',
      });
      setShowModal(true);
    } catch {
      setShowModal(true);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      customerCode: cust.customerCode,
      customerName: cust.customerName,
      mobile: cust.mobile || '',
      address: cust.address || '',
      village: cust.village || '',
      customerType: cust.customerType || 'Household',
      milkType: cust.milkType || 'Mixed',
      morningDefaultQty: cust.morningDefaultQty || 0,
      eveningDefaultQty: cust.eveningDefaultQty || 0,
      defaultRate: cust.defaultRate || 0,
      billingCycle: cust.billingCycle || 'Monthly',
      openingBalance: cust.openingBalance || 0,
      notes: cust.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerCode) {
      showWarning('Please enter customer name and code');
      return;
    }

    try {
      if (editingCustomer) {
        const res = await customerService.updateCustomer(editingCustomer._id, formData);
        if (res.success) {
          showSuccess(`Updated customer #${formData.customerCode} ${formData.customerName}`);
        }
      } else {
        const res = await customerService.createCustomer(formData);
        if (res.success) {
          showSuccess(`Added new customer #${formData.customerCode} ${formData.customerName}`);
        }
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save customer');
    }
  };

  // Open 360° Profile
  const handleOpenProfile = async (cust) => {
    setSelectedProfile(cust);
    setProfileLoading(true);
    try {
      const res = await customerPaymentService.getCustomerLedger(cust.customerCode);
      if (res.success) {
        setProfileLedger(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) return;
    const data = filteredCustomers.map((c) => ({
      'Customer Code': c.customerCode,
      'Customer Name': c.customerName,
      Type: c.customerType,
      'Milk Type': c.milkType,
      'Morning Qty (L)': c.morningDefaultQty,
      'Evening Qty (L)': c.eveningDefaultQty,
      'Default Rate (₹)': c.defaultRate,
      'Billing Cycle': c.billingCycle,
      'Opening Balance (₹)': c.openingBalance,
      Mobile: c.mobile || '',
      Village: c.village || '',
      Address: c.address || '',
      Status: c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `Balaji_Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported customer master to Excel');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await customerService.deleteCustomer(deleteId);
      if (res.success) {
        showSuccess('Customer deleted successfully');
        setDeleteId(null);
        fetchCustomers();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Customer Master"
        hindiTitle="ग्राहक मास्टर सूची"
        subtitle="Manage regular milk buyers, route defaults, billing cycles, and customer 360° profiles."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={handleOpenAdd} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Add Customer</span>
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by code, customer name, phone, or village..."
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="">All Types</option>
              <option value="Household">Household (घर)</option>
              <option value="Shop">Shop (दुकान)</option>
              <option value="Hotel">Hotel (होटल)</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Sweet Shop">Sweet Shop (मिठाई)</option>
              <option value="Institution">Institution</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="">All Areas / Villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customers Master Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Customer Directory ({filteredCustomers.length})
          </h3>
        </div>

        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Type</th>
                <th>Milk Type</th>
                <th>Morning Qty</th>
                <th>Evening Qty</th>
                <th>Default Rate</th>
                <th>Billing Cycle</th>
                <th>Mobile</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust._id}>
                    <td>
                      <span className="badge badge-info font-mono-num">C#{cust.customerCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {cust.customerName}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{cust.customerType}</span>
                    </td>
                    <td>{cust.milkType}</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">{cust.morningDefaultQty} L</td>
                    <td style={{ fontWeight: 700 }} className="font-mono-num">{cust.eveningDefaultQty} L</td>
                    <td className="font-mono-num">₹{cust.defaultRate}/L</td>
                    <td>{cust.billingCycle}</td>
                    <td>
                      {cust.mobile ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="font-mono-num">
                          <Phone size={13} color="var(--color-text-muted)" />
                          {cust.mobile}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenProfile(cust)}
                          className="btn-icon-sm btn-secondary"
                          title="View 360° Profile & Ledger"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="btn-icon-sm btn-ghost"
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        {(user?.role === 'owner' || user?.role === 'manager') && (
                          <button
                            onClick={() => setDeleteId(cust._id)}
                            className="btn-icon-sm btn-ghost"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete Customer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No customers found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? `Edit Customer C#${formData.customerCode}` : 'Register New Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmitForm}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Customer Code <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                className="form-control font-mono-num"
                value={formData.customerCode}
                onChange={(e) => setFormData({ ...formData, customerCode: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Anand Sweet House"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                className="form-control"
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Category</label>
              <select
                className="form-control"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              >
                <option value="Household">Household (घर)</option>
                <option value="Shop">Shop (दुकान)</option>
                <option value="Hotel">Hotel (होटल)</option>
                <option value="Restaurant">Restaurant (रेस्टोरेंट)</option>
                <option value="Sweet Shop">Sweet Shop (हलवाई)</option>
                <option value="Institution">Institution (संस्था)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Milk Type</label>
              <select
                className="form-control"
                value={formData.milkType}
                onChange={(e) => setFormData({ ...formData, milkType: e.target.value })}
              >
                <option value="Cow">Cow (गाय)</option>
                <option value="Buffalo">Buffalo (भैंस)</option>
                <option value="Mixed">Mixed (मिक्स)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Morning Default Qty (L)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control font-mono-num"
                value={formData.morningDefaultQty}
                onChange={(e) => setFormData({ ...formData, morningDefaultQty: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Evening Default Qty (L)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control font-mono-num"
                value={formData.eveningDefaultQty}
                onChange={(e) => setFormData({ ...formData, eveningDefaultQty: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Selling Rate (₹/L) <span className="required">*</span></label>
              <input
                type="number"
                step="0.5"
                min="1"
                className="form-control font-mono-num"
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
                value={formData.defaultRate}
                onChange={(e) => setFormData({ ...formData, defaultRate: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Cycle</label>
              <select
                className="form-control"
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
              >
                <option value="Daily">Daily (दैनिक)</option>
                <option value="Weekly">Weekly (साप्ताहिक)</option>
                <option value="10-day">10-day (10 दिन)</option>
                <option value="Monthly">Monthly (मासिक)</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Opening Balance (₹)</label>
              <input
                type="number"
                step="1"
                className="form-control font-mono-num"
                placeholder="0"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Village / Sector</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Sector 4 or Main Market"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. House 42, Gali No. 2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
              {editingCustomer ? 'Save Changes' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 360° Profile Modal */}
      {selectedProfile && (
        <Modal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          title={`Customer 360° Profile: C#${selectedProfile.customerCode} ${selectedProfile.customerName}`}
          size="xl"
        >
          {profileLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner spinner-gold" style={{ margin: '0 auto 1rem auto' }} />
              <p>Loading customer deliveries & ledger...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Customer KPI Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369A1' }}>Total Milk Delivered</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                    {profileLedger?.summary?.totalMilk || 0} L
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Sales Amount</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.totalSales || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Paid</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.totalPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C' }}>Current Outstanding</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.pendingBalance || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  onClick={() => {
                    const text = generateCustomerWhatsAppText({
                      customerName: selectedProfile.customerName,
                      customerCode: selectedProfile.customerCode,
                      billDate: new Date().toISOString().split('T')[0],
                      startDate: 'Current Month',
                      endDate: 'Today',
                      previousBalance: profileLedger?.summary?.openingBalance || 0,
                      totalLitres: profileLedger?.summary?.totalMilk || 0,
                      milkAmount: profileLedger?.summary?.totalSales || 0,
                      paymentsReceived: profileLedger?.summary?.totalPaid || 0,
                      adjustments: profileLedger?.summary?.totalAdjusted || 0,
                      finalPayable: profileLedger?.summary?.pendingBalance || 0,
                    });
                    openWhatsApp(selectedProfile.mobile, text);
                  }}
                  className="btn btn-success btn-sm"
                >
                  <span>WhatsApp Statement</span>
                </button>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                  <Printer size={14} />
                  <span>Print</span>
                </button>
              </div>

              {/* Detailed Running Ledger */}
              <div className="table-responsive" style={{ maxHeight: '45vh' }}>
                <table className="dairy-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Type</th>
                      <th>Description</th>
                      <th>Delivery (Dr)</th>
                      <th>Payment (Cr)</th>
                      <th>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileLedger?.history?.map((item, idx) => (
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
                        <td style={{ fontWeight: 800, color: item.balance > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)' }} className="font-mono-num">
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer Profile"
        message="Are you sure you want to delete this customer? If the customer has previous deliveries, deletion will be rejected to protect business ledger integrity."
        confirmText="Yes, Delete Customer"
        isDanger={true}
      />
    </div>
  );
};

export default Customers;
