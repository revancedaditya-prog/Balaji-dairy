import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/api';
import * as XLSX from 'xlsx';

const Suppliers = () => {
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
      fatherName: supplier.fatherName,
      mobile: supplier.mobile,
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
        // Update
        const res = await supplierService.updateSupplier(editingId, payload);
        if (res.success) {
          setSuccess('Supplier updated successfully');
          loadSuppliers();
          resetForm();
        }
      } else {
        // Create
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

    // Auto-fit column widths
    const maxLens = {};
    formattedData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const len = String(row[key] || '').length;
        maxLens[key] = Math.max(maxLens[key] || key.length, len);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map((key) => ({ wch: maxLens[key] + 3 }));

    XLSX.writeFile(workbook, `Suppliers_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // PDF Export using Browser Print stylesheet formatting
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

  // Download sample Excel template for imports
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

  // Parse Excel file and upload suppliers
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

        // Map parsed Excel keys to standard supplier keys case-insensitively
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
        // Clear input value so same file can be uploaded again if needed
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="suppliers-view">
      <div className="view-header">
        <div>
          <h1>Supplier Management</h1>
          <p className="text-muted">Register and configure dairy farmers directory</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={downloadTemplate} title="Download Import Excel Template">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Download Template
          </button>
          <button className="btn btn-outline" onClick={() => document.getElementById('excel-file-input').click()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Import Excel
          </button>
          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls"
            onChange={handleExcelUpload}
            style={{ display: 'none' }}
          />
          <button className="btn btn-outline" onClick={exportToExcel}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export Excel
          </button>
          <button className="btn btn-outline" onClick={exportToPDF}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/><path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
            PDF Print
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Supplier
          </button>
        </div>
      </div>

      {success && <div className="success-alert">{success}</div>}
      {error && <div className="error-alert">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="card filters-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
          <div>
            <label className="form-label">Search Supplier</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Code or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Filter by Village</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter village name..."
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Filter by Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-loading">
            <div className="spinner"></div>
            <span>Fetching supplier list...</span>
          </div>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                      <span className={`badge badge-${s.status === 'active' ? 'active' : 'inactive'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{new Date(s.joiningDate).toLocaleDateString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleEdit(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(s._id, s.supplierCode)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                    No matching suppliers found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Popup Form */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingId ? `Edit Supplier Profile (#${formData.supplierCode})` : 'Register New Supplier'}</h2>
              <button className="btn-close" onClick={resetForm}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supplier Code (Unique Number)*</label>
                    <input
                      type="number"
                      name="supplierCode"
                      className="form-control"
                      value={formData.supplierCode}
                      onChange={handleInputChange}
                      required
                      disabled={!!editingId}
                      placeholder="e.g. 101"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Farmer / Supplier Name*</label>
                    <input
                      type="text"
                      name="supplierName"
                      className="form-control"
                      value={formData.supplierName}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                   <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input
                      type="text"
                      name="fatherName"
                      className="form-control"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                      placeholder="Enter father's name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input
                      type="tel"
                      name="mobile"
                      className="form-control"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Village*</label>
                    <input
                      type="text"
                      name="village"
                      className="form-control"
                      value={formData.village}
                      onChange={handleInputChange}
                      required
                      placeholder="Village name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date</label>
                    <input
                      type="date"
                      name="joiningDate"
                      className="form-control"
                      value={formData.joiningDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status*</label>
                    <select
                      name="status"
                      className="form-control"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Register Farmer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
