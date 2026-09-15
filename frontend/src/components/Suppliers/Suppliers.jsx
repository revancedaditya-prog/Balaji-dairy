import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Download,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Milk,
  BookOpen,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supplierService, paymentService, milkEntryService } from '../../services/api';
import { PageHeader, SearchInput, Modal, ConfirmationDialog, Currency, Quantity, StatusBadge } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';
import { generateSupplierWhatsAppText, openWhatsApp } from '../../utils/whatsapp';

const Suppliers = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [villages, setVillages] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    supplierCode: '',
    supplierName: '',
    fatherName: '',
    mobile: '',
    village: '',
    status: 'active',
  });

  // Supplier Profile 360 View Modal
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileTab, setProfileTab] = useState('overview'); // overview | milk | payments | ledger
  const [profileLedger, setProfileLedger] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Delete Dialog
  const [deleteId, setDeleteId] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getSuppliers();
      if (res.success) {
        setSuppliers(res.data);
        const uniqueVillages = [...new Set(res.data.map((s) => s.village).filter(Boolean))];
        setVillages(uniqueVillages);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load suppliers directory');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filtered list
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      String(s.supplierCode).includes(searchTerm) ||
      s.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.mobile && s.mobile.includes(searchTerm)) ||
      (s.village && s.village.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesVillage = !selectedVillage || s.village === selectedVillage;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesVillage && matchesStatus;
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    const maxCode = suppliers.reduce((max, s) => (s.supplierCode > max ? s.supplierCode : max), 0);
    setEditingSupplier(null);
    setFormData({
      supplierCode: maxCode + 1,
      supplierName: '',
      fatherName: '',
      mobile: '',
      village: villages[0] || '',
      status: 'active',
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      supplierCode: sup.supplierCode,
      supplierName: sup.supplierName,
      fatherName: sup.fatherName || '',
      mobile: sup.mobile || '',
      village: sup.village || '',
      status: sup.status || 'active',
    });
    setShowModal(true);
  };

  // Submit Supplier Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.supplierName.trim() || !formData.supplierCode) {
      showWarning('Please provide Farmer Name and Code');
      return;
    }

    try {
      if (editingSupplier) {
        const res = await supplierService.updateSupplier(editingSupplier._id, formData);
        if (res.success) {
          showSuccess(`Updated farmer #${formData.supplierCode} ${formData.supplierName}`);
        }
      } else {
        const res = await supplierService.addSupplier(formData);
        if (res.success) {
          showSuccess(`Added new farmer #${formData.supplierCode} ${formData.supplierName}`);
        }
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save farmer profile');
    }
  };

  // Open 360° Profile
  const handleOpenProfile = async (sup) => {
    setSelectedProfile(sup);
    setProfileTab('overview');
    setProfileLoading(true);
    try {
      const res = await paymentService.getSupplierLedger(sup.supplierCode);
      if (res.success) {
        setProfileLedger(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      showWarning('No suppliers to export');
      return;
    }

    const data = filteredSuppliers.map((s) => ({
      'Supplier Code': s.supplierCode,
      'Farmer Name': s.supplierName,
      'Father Name': s.fatherName || '',
      Mobile: s.mobile || '',
      Village: s.village || '',
      Status: s.status,
      'Joining Date': s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-IN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Farmers');
    XLSX.writeFile(wb, `Balaji_Dairy_Farmers_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported farmers directory to Excel');
  };

  const handleDeleteSupplier = async () => {
    if (!deleteId) return;
    try {
      const res = await supplierService.deleteSupplier(deleteId);
      if (res.success) {
        showSuccess('Farmer deleted successfully');
        setDeleteId(null);
        fetchSuppliers();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete farmer');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <PageHeader
        title="Farmers & Suppliers"
        hindiTitle="किसान / सप्लायर डायरेक्टरी"
        subtitle="Manage registered milk producers, profile cards, village groups, and 360° transaction history."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={handleOpenAdd} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Plus size={16} strokeWidth={3} />
              <span>+ Add Farmer</span>
            </button>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by code, farmer name, phone, or village..."
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

          <div style={{ minWidth: '130px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '40px' }}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Farmers Master Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Registered Farmers ({filteredSuppliers.length})
          </h3>
        </div>

        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Farmer Name</th>
                <th>Father's Name</th>
                <th>Village</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((sup) => (
                  <tr key={sup._id}>
                    <td>
                      <span className="badge badge-gold font-mono-num">#{sup.supplierCode}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {sup.supplierName}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {sup.fatherName || '—'}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-main)', fontWeight: 500 }}>
                        <MapPin size={13} color="var(--color-text-muted)" />
                        {sup.village || '—'}
                      </span>
                    </td>
                    <td>
                      {sup.mobile ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="font-mono-num">
                          <Phone size={13} color="var(--color-text-muted)" />
                          {sup.mobile}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={sup.status} />
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
                      {sup.joiningDate ? new Date(sup.joiningDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleOpenProfile(sup)}
                          className="btn-icon-sm btn-secondary"
                          title="View 360° Profile & Ledger"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="btn-icon-sm btn-ghost"
                          title="Edit Farmer"
                        >
                          <Edit2 size={14} />
                        </button>
                        {(user?.role === 'owner' || user?.role === 'manager') && (
                          <button
                            onClick={() => setDeleteId(sup._id)}
                            className="btn-icon-sm btn-ghost"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete Farmer"
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
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                    No farmers found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Farmer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? `Edit Farmer #${formData.supplierCode}` : 'Register New Farmer'}
      >
        <form onSubmit={handleSubmitForm}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Farmer Code <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                className="form-control font-mono-num"
                value={formData.supplierCode}
                onChange={(e) => setFormData({ ...formData, supplierCode: Number(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Farmer Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Singh"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Father's Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Shyam Lal"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
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
              <label className="form-label">Village / Area <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Kalyanpur"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>
              {editingSupplier ? 'Save Changes' : 'Register Farmer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteSupplier}
        title="Delete Farmer Profile"
        message="Are you sure you want to delete this farmer? If this farmer has previous milk collection or payment history, deletion will be blocked to preserve historical records."
        confirmText="Yes, Delete Farmer"
        isDanger={true}
      />

      {/* 360° Supplier Profile Modal */}
      {selectedProfile && (
        <Modal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          title={`Farmer Profile: #${selectedProfile.supplierCode} ${selectedProfile.supplierName}`}
          size="xl"
        >
          {profileLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div className="spinner spinner-gold" style={{ margin: '0 auto 1rem auto' }} />
              <p>Loading farmer ledger and delivery records...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile KPI Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FFF8E7', border: '1px solid #E8D49E' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E' }}>Total Milk Supplied</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                    {profileLedger?.summary?.totalMilk || 0} L
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Milk Value</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D' }}>Total Paid</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.totalPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C' }}>Pending Payable</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.2rem' }} className="font-mono-num">
                    ₹{(profileLedger?.summary?.pendingAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Action Ribbon: WhatsApp statement & print */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  onClick={() => {
                    const text = generateSupplierWhatsAppText({
                      supplierName: selectedProfile.supplierName,
                      supplierCode: selectedProfile.supplierCode,
                      date: new Date().toISOString().split('T')[0],
                      totalMilk: profileLedger?.summary?.totalMilk || 0,
                      totalAmount: profileLedger?.summary?.totalAmount || 0,
                      totalPaid: profileLedger?.summary?.totalPaid || 0,
                      pendingAmount: profileLedger?.summary?.pendingAmount || 0,
                    });
                    openWhatsApp(selectedProfile.mobile, text);
                  }}
                  className="btn btn-success btn-sm"
                >
                  <span>Share on WhatsApp</span>
                </button>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                  <Printer size={14} />
                  <span>Print Statement</span>
                </button>
              </div>

              {/* Detailed Running Ledger Table */}
              <div className="table-responsive" style={{ maxHeight: '45vh' }}>
                <table className="dairy-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Purchase (Cr)</th>
                      <th>Payment (Dr)</th>
                      <th>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileLedger?.history?.length > 0 ? (
                      profileLedger.history.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '0.8rem' }}>{item.date}</td>
                          <td>
                            <span className={`badge ${item.txnType === 'debit' ? 'badge-gold' : 'badge-success'}`}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)' }}>
                            {item.description}
                          </td>
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                          No historical entries found for this farmer.
                        </td>
                      </tr>
                    )}
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

export default Suppliers;
