import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Modal, EmptyState, Loading } from '../Common/MaterialComponents';

const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    supplierCode: '',
    supplierName: '',
    fatherName: '',
    mobile: '',
    village: '',
    status: 'active',
    joiningDate: new Date().toISOString().split('T')[0]
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await supplierService.getSuppliers({ search, village, status });
      if (res.success) {
        setSuppliers(res.data);
      }
    } catch (err) {
      setError('Failed to fetch suppliers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadSuppliers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, village, status]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const resetForm = () => {
    setFormData({
      supplierCode: '',
      supplierName: '',
      fatherName: '',
      mobile: '',
      village: '',
      status: 'active',
      joiningDate: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setFormData({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      fatherName: supplier.fatherName || '',
      mobile: supplier.mobile || '',
      village: supplier.village,
      status: supplier.status,
      joiningDate: supplier.joiningDate ? supplier.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = { ...formData };
    if (!payload.joiningDate) {
      delete payload.joiningDate;
    }

    try {
      if (editingId) {
        const res = await supplierService.updateSupplier(editingId, payload);
        if (res.success) {
          setSuccess('Supplier updated successfully');
          loadSuppliers();
          resetForm();
        }
      } else {
        const res = await supplierService.addSupplier(payload);
        if (res.success) {
          setSuccess('Supplier added successfully');
          loadSuppliers();
          resetForm();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Please check Supplier Code uniqueness.');
      console.error(err);
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete Supplier Code #${code}?`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await supplierService.deleteSupplier(id);
      if (res.success) {
        setSuccess(`Supplier #${code} deleted successfully`);
        loadSuppliers();
      }
    } catch (err) {
      setError('Failed to delete supplier');
      console.error(err);
    }
  };

  // Excel Export
  const exportToExcel = () => {
    const formattedData = suppliers.map((s) => ({
      'Supplier Code': s.supplierCode,
      'Supplier Name': s.supplierName,
      'Father Name': s.fatherName,
      'Mobile Number': s.mobile,
      'Village': s.village,
      'Status': s.status.toUpperCase(),
      'Joining Date': new Date(s.joiningDate).toLocaleDateString('en-IN')
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
    XLSX.writeFile(workbook, `Suppliers_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // PDF Export
  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Suppliers List - Balaji Dairy</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e40af; margin-bottom: 5px; }
            h4 { text-align: center; font-weight: normal; margin-top: 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; color: #4b5563; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            td { border: 1px solid #e5e7eb; padding: 8px; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status-active { color: green; font-weight: bold; }
            .status-inactive { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>BALAJI DAIRY MANAGEMENT SYSTEM</h2>
          <h4>SUPPLIERS DIRECTORY - LOGGED ON ${new Date().toLocaleDateString('en-IN')}</h4>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Father's Name</th>
                <th>Mobile</th>
                <th>Village</th>
                <th>Status</th>
                <th>Joining Date</th>
              </tr>
            </thead>
            <tbody>
              ${suppliers.map(s => `
                <tr>
                  <td><b>#${s.supplierCode}</b></td>
                  <td>${s.supplierName}</td>
                  <td>${s.fatherName}</td>
                  <td>${s.mobile}</td>
                  <td>${s.village}</td>
                  <td class="status-${s.status}">${s.status.toUpperCase()}</td>
                  <td>${new Date(s.joiningDate).toLocaleDateString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Supplier Code': 105,
        'Supplier Name': 'Amit Patel',
        'Father Name': 'Kantilal Patel',
        'Mobile Number': '9876543211',
        'Village': 'Viramgam',
        'Status': 'active',
        'Joining Date': '2026-06-02'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Supplier_Import_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
          setError('Excel file is empty');
          return;
        }

        const mappedSuppliers = rawData.map((row) => {
          const findVal = (patterns) => {
            const key = Object.keys(row).find((k) => 
              patterns.some((p) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
            );
            return key ? row[key] : '';
          };

          return {
            supplierCode: findVal(['suppliercode', 'code', 'number']),
            supplierName: findVal(['suppliername', 'farmername', 'name']),
            fatherName: findVal(['fathername', 'fathersname', 'father']),
            mobile: findVal(['mobile', 'phone', 'mobilenumber', 'contact']),
            village: findVal(['village', 'city', 'town']),
            status: findVal(['status']) || 'active',
            joiningDate: findVal(['joiningdate', 'date', 'joined']),
          };
        });

        setLoading(true);
        setError('');
        setSuccess('');

        const res = await supplierService.bulkUpload(mappedSuppliers);
        if (res.success) {
          let msg = `Successfully uploaded ${res.insertedCount} suppliers.`;
          if (res.skippedCount > 0) {
            msg += ` Skipped ${res.skippedCount} duplicates/invalid rows.`;
          }
          setSuccess(msg);
          loadSuppliers();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to parse or upload Excel file');
        console.error(err);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="suppliers-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      {success && <div className="success-alert" style={{ marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Search and Filters */}
      <Card style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
          <Input
            label="Search Farmer"
            type="text"
            placeholder="Search by Code or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            label="Filter by Village"
            type="text"
            placeholder="Village name..."
            value={village}
            onChange={(e) => setVillage(e.target.value)}
          />
          <div>
            <label className="input-md3-label">Filter by Status</label>
            <select className="input-md3-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {user?.role !== 'worker' && (
            <>
              <Button variant="outlined" onClick={downloadTemplate} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>Download Template</Button>
              <Button variant="outlined" onClick={() => document.getElementById('excel-file-input').click()} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>Import Excel</Button>
              <input
                type="file"
                id="excel-file-input"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
              />
            </>
          )}
          <Button variant="outlined" onClick={exportToExcel} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>Export Excel</Button>
          <Button variant="outlined" onClick={exportToPDF} style={{ minHeight: '40px', padding: '0.5rem 1rem' }}>PDF Print</Button>
          
          {/* Desktop Only Add button */}
          {user?.role !== 'worker' && (
            <Button variant="primary" className="desktop-only" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto', minHeight: '40px', padding: '0.5rem 1.25rem' }}>
              Add Supplier
            </Button>
          )}
        </div>
      </Card>

      {/* Mobile Floating Action Button (FAB) */}
      {user?.role !== 'worker' && (
        <button 
          className="fab-md3 mobile-only" 
          onClick={() => setShowModal(true)}
          aria-label="Add Supplier"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        </button>
      )}

      {/* Desktop List View */}
      <Card style={{ padding: '1rem' }} className="desktop-only">
        <div className="table-container">
          {loading ? (
            <Loading label="Fetching supplier list..." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Supplier Name</th>
                  <th>Father Name</th>
                  <th>Mobile Number</th>
                  <th>Village</th>
                  <th>Status</th>
                  <th>Joining Date</th>
                  {user?.role !== 'worker' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.length > 0 ? (
                  suppliers.map((s) => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: '600' }}>#{s.supplierCode}</td>
                      <td>{s.supplierName}</td>
                      <td>{s.fatherName}</td>
                      <td>{s.mobile}</td>
                      <td>{s.village}</td>
                      <td>
                        <Badge type={s.status === 'active' ? 'success' : 'error'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td>{new Date(s.joiningDate).toLocaleDateString('en-IN')}</td>
                      {user?.role !== 'worker' && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="outlined"
                            style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                            onClick={() => handleEdit(s)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            style={{ padding: '0.25rem 0.5rem', minHeight: '32px', fontSize: '0.75rem' }}
                            onClick={() => handleDelete(s._id, s.supplierCode)}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                      No matching suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Mobile Card List View */}
      <div className="mobile-card-list mobile-only">
        {loading ? (
          <Loading label="Fetching supplier list..." />
        ) : suppliers.length > 0 ? (
          suppliers.map((s) => (
            <div key={s._id} className="mobile-row-card" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
              <div className="mobile-row-card-header">
                <div className="mobile-row-card-title">
                  <Badge type="primary" style={{ marginRight: '0.5rem' }}>#{s.supplierCode}</Badge>
                  {s.supplierName}
                </div>
                <Badge type={s.status === 'active' ? 'success' : 'error'}>
                  {s.status}
                </Badge>
              </div>
              <div className="mobile-row-card-body">
                {s.fatherName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Father's Name:</span>
                    <span>{s.fatherName}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Village:</span>
                  <span style={{ fontWeight: '500' }}>{s.village}</span>
                </div>
                {s.mobile && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span>Mobile:</span>
                    <a href={`tel:${s.mobile}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--md-sys-color-primary)', fontWeight: '600' }}>
                      {s.mobile}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 9.92z"/></svg>
                    </a>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '0.25rem' }}>
                  <span>Joined:</span>
                  <span>{new Date(s.joiningDate).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              {user?.role !== 'worker' && (
                <div className="mobile-row-card-actions">
                  <Button
                    variant="outlined"
                    style={{ padding: '0.25rem 0.75rem', minHeight: '36px', fontSize: '0.8rem' }}
                    onClick={() => handleEdit(s)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    style={{ padding: '0.25rem 0.75rem', minHeight: '36px', fontSize: '0.8rem' }}
                    onClick={() => handleDelete(s._id, s.supplierCode)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState message="No farmers registered match the filter search criteria" />
        )}
      </div>

      {/* Register/Edit Modal Dialog */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? `Edit Supplier Profile (#${formData.supplierCode})` : 'Register New Supplier'}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
            <Input
              label="Supplier Code (Unique Number)*"
              type="number"
              inputMode="numeric"
              name="supplierCode"
              value={formData.supplierCode}
              onChange={handleInputChange}
              required
              disabled={!!editingId}
              placeholder="e.g. 101"
              className={editingId ? '' : 'flex-1'}
            />
            <Input
              label="Farmer Name*"
              type="text"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleInputChange}
              required
              placeholder="Enter full name"
            />
            <Input
              label="Father's Name"
              type="text"
              name="fatherName"
              value={formData.fatherName}
              onChange={handleInputChange}
              placeholder="Enter father's name"
            />
            <Input
              label="Mobile Number"
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              placeholder="10-digit number"
            />
            <Input
              label="Village*"
              type="text"
              name="village"
              value={formData.village}
              onChange={handleInputChange}
              required
              placeholder="Village name"
            />
            <Input
              label="Joining Date"
              type="date"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleInputChange}
            />
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="input-md3-label">Status*</label>
              <select
                name="status"
                className="input-md3-control"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Button variant="outlined" onClick={resetForm}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Register Farmer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Suppliers;
