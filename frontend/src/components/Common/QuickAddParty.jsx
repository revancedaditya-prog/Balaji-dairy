import React, { useEffect, useState } from 'react';
import { supplierService } from '../../services/api';
import customerMilkService, { todayIST } from '../../services/customerMilkApi';
import { Modal, Button, Input } from './MaterialComponents';

const supplierDefaults = () => ({
  supplierCode: '',
  supplierName: '',
  fatherName: '',
  mobile: '',
  village: '',
  status: 'active',
  joiningDate: todayIST(),
});

const customerDefaults = () => ({
  customerName: '',
  mobile: '',
  address: '',
  village: '',
  customerType: 'Household',
  defaultRate: '',
  morningQty: '',
  eveningQty: '',
  billingCycle: 'Monthly',
  openingBalance: '0',
  status: 'active',
  startDate: todayIST(),
  notes: '',
});

export default function QuickAddParty({ type, onClose, onSaved }) {
  const [supplier, setSupplier] = useState(supplierDefaults());
  const [customer, setCustomer] = useState(customerDefaults());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'supplier') setSupplier(supplierDefaults());
    if (type === 'customer') setCustomer(customerDefaults());
    setError('');
    setSaving(false);
  }, [type]);

  if (!type) return null;

  const saveSupplier = async (e) => {
    e.preventDefault();
    setError('');
    if (!supplier.supplierCode || !supplier.supplierName.trim() || !supplier.village.trim()) {
      setError('Supplier code, supplier name and village are required.');
      return;
    }
    try {
      setSaving(true);
      await supplierService.addSupplier(supplier);
      onSaved?.('supplier');
    } catch (e) {
      setError(e?.message || 'Could not add supplier. Check that the supplier code is unique.');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    setError('');
    if (!customer.customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    try {
      setSaving(true);
      await customerMilkService.addCustomer(customer);
      onSaved?.('customer');
    } catch (e) {
      setError(e?.message || 'Could not add customer.');
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = { width: '100%', minHeight: 46 };
  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 };

  return (
    <Modal
      isOpen={Boolean(type)}
      onClose={saving ? undefined : onClose}
      title={type === 'supplier' ? 'Add Supplier / Farmer' : 'Add Customer'}
    >
      {error && <div className="error-alert" style={{ marginBottom: 14 }}>{error}</div>}

      {type === 'supplier' ? (
        <form onSubmit={saveSupplier}>
          <div style={gridStyle}>
            <Input label="Supplier Code *" type="number" inputMode="numeric" min="1" value={supplier.supplierCode} onChange={(e)=>setSupplier({...supplier,supplierCode:e.target.value})} required />
            <Input label="Supplier / Farmer Name *" value={supplier.supplierName} onChange={(e)=>setSupplier({...supplier,supplierName:e.target.value})} required />
            <Input label="Father's Name" value={supplier.fatherName} onChange={(e)=>setSupplier({...supplier,fatherName:e.target.value})} />
            <Input label="Mobile Number" type="tel" inputMode="numeric" value={supplier.mobile} onChange={(e)=>setSupplier({...supplier,mobile:e.target.value})} />
            <Input label="Village *" value={supplier.village} onChange={(e)=>setSupplier({...supplier,village:e.target.value})} required />
            <Input label="Joining Date" type="date" value={supplier.joiningDate} onChange={(e)=>setSupplier({...supplier,joiningDate:e.target.value})} />
            <div>
              <label className="input-md3-label">Status</label>
              <select className="input-md3-control" style={selectStyle} value={supplier.status} onChange={(e)=>setSupplier({...supplier,status:e.target.value})}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
            <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Supplier'}</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={saveCustomer}>
          <div style={gridStyle}>
            <Input label="Customer Name *" value={customer.customerName} onChange={(e)=>setCustomer({...customer,customerName:e.target.value})} required />
            <Input label="Mobile Number" type="tel" inputMode="numeric" value={customer.mobile} onChange={(e)=>setCustomer({...customer,mobile:e.target.value})} />
            <Input label="Village" value={customer.village} onChange={(e)=>setCustomer({...customer,village:e.target.value})} />
            <Input label="Address" value={customer.address} onChange={(e)=>setCustomer({...customer,address:e.target.value})} />
            <div>
              <label className="input-md3-label">Customer Type</label>
              <select className="input-md3-control" style={selectStyle} value={customer.customerType} onChange={(e)=>setCustomer({...customer,customerType:e.target.value})}>
                <option>Household</option><option>Shop</option><option>Hotel</option><option>Restaurant</option><option>Other</option>
              </select>
            </div>
            <Input label="Milk Rate (₹/L)" type="number" inputMode="decimal" step="0.01" min="0" value={customer.defaultRate} onChange={(e)=>setCustomer({...customer,defaultRate:e.target.value})} />
            <Input label="Morning Qty (L)" type="number" inputMode="decimal" step="0.01" min="0" value={customer.morningQty} onChange={(e)=>setCustomer({...customer,morningQty:e.target.value})} />
            <Input label="Evening Qty (L)" type="number" inputMode="decimal" step="0.01" min="0" value={customer.eveningQty} onChange={(e)=>setCustomer({...customer,eveningQty:e.target.value})} />
            <div>
              <label className="input-md3-label">Billing Cycle</label>
              <select className="input-md3-control" style={selectStyle} value={customer.billingCycle} onChange={(e)=>setCustomer({...customer,billingCycle:e.target.value})}>
                <option>Daily</option><option>Weekly</option><option>10 Day</option><option>Monthly</option><option>Manual</option>
              </select>
            </div>
            <Input label="Opening Balance (₹)" type="number" inputMode="decimal" step="0.01" value={customer.openingBalance} onChange={(e)=>setCustomer({...customer,openingBalance:e.target.value})} />
            <Input label="Start Date" type="date" value={customer.startDate} onChange={(e)=>setCustomer({...customer,startDate:e.target.value})} />
            <div>
              <label className="input-md3-label">Status</label>
              <select className="input-md3-control" style={selectStyle} value={customer.status} onChange={(e)=>setCustomer({...customer,status:e.target.value})}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <label className="input-md3-label">Notes</label>
            <textarea className="input-md3-control" rows="3" value={customer.notes} onChange={(e)=>setCustomer({...customer,notes:e.target.value})} placeholder="Optional notes" />
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
            <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Customer'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
