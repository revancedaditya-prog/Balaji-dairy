import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Trash2, WalletCards, Milk, Users, IndianRupee, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import customerMilkService, { todayIST } from '../../services/customerMilkApi';
import './CustomerMilk.css';

const emptyCustomer = { customerName:'', mobile:'', address:'', village:'', customerType:'Household', defaultRate:'', morningQty:'', eveningQty:'', billingCycle:'Monthly', openingBalance:'0', status:'active', startDate:todayIST(), notes:'' };
const emptyDelivery = { customerId:'', date:todayIST(), shift:'Morning', milkType:'Mixed', quantity:'', rate:'', status:'Delivered', notes:'' };
const emptyPayment = { customerId:'', date:todayIST(), amount:'', mode:'Cash', referenceNo:'', notes:'' };

const money = n => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const liters = n => `${Number(n || 0).toFixed(2)} L`;

export default function CustomerMilk() {
  const { user } = useAuth();
  const canManage = ['owner','manager'].includes(user?.role);
  const isOwner = user?.role === 'owner';
  const [tab,setTab] = useState(canManage ? 'overview' : 'deliveries');
  const [customers,setCustomers] = useState([]);
  const [deliveries,setDeliveries] = useState([]);
  const [payments,setPayments] = useState([]);
  const [ledger,setLedger] = useState([]);
  const [search,setSearch] = useState('');
  const [date,setDate] = useState(todayIST());
  const [shift,setShift] = useState('Morning');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  const [modal,setModal] = useState(null);
  const [customerForm,setCustomerForm] = useState(emptyCustomer);
  const [deliveryForm,setDeliveryForm] = useState(emptyDelivery);
  const [paymentForm,setPaymentForm] = useState(emptyPayment);
  const [ledgerDetail,setLedgerDetail] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const c = await customerMilkService.getCustomers();
      setCustomers(c || []);
      const d = await customerMilkService.getDeliveries({ date });
      setDeliveries(d || []);
      if (canManage) {
        const [p,l] = await Promise.all([customerMilkService.getPayments({ limit:300 }), customerMilkService.getLedgerSummary()]);
        setPayments(p || []); setLedger(l || []);
      }
    } catch (e) { setError(e.message || 'Could not load customer milk data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { customerMilkService.getDeliveries({ date }).then(setDeliveries).catch(()=>{}); }, [date]);

  const filteredCustomers = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(c => [c.customer_name,c.mobile,c.village,c.address,String(c.customer_code)].some(v => String(v || '').toLowerCase().includes(s)));
  }, [customers,search]);

  const todayDelivered = deliveries.filter(d => d.delivery_status === 'Delivered');
  const todayLiters = todayDelivered.reduce((a,d)=>a+Number(d.quantity_liters||0),0);
  const todaySales = todayDelivered.reduce((a,d)=>a+Number(d.amount||0),0);
  const totalOutstanding = ledger.reduce((a,x)=>a+Number(x.outstanding_amount||0),0);

  const selectedCustomer = customers.find(c => c.id === deliveryForm.customerId);
  const chooseCustomerForDelivery = id => {
    const c = customers.find(x=>x.id===id);
    setDeliveryForm(f => ({...f, customerId:id, rate:c ? String(c.default_rate_per_liter ?? '') : '', quantity:c ? String(f.shift==='Morning' ? c.default_morning_qty ?? '' : c.default_evening_qty ?? '') : ''}));
  };

  const saveCustomer = async e => {
    e.preventDefault(); setError('');
    try { await customerMilkService.addCustomer(customerForm); setModal(null); setCustomerForm(emptyCustomer); setSuccess('Customer added successfully'); await load(); }
    catch(e){ setError(e.message); }
  };

  const saveDelivery = async e => {
    e.preventDefault(); setError('');
    try { await customerMilkService.addDelivery(deliveryForm); setModal(null); setDeliveryForm({...emptyDelivery,date,shift}); setSuccess('Milk delivery recorded'); await load(); }
    catch(e){ setError(e.message); }
  };

  const quickDeliver = async customer => {
    const qty = Number(shift === 'Morning' ? customer.default_morning_qty : customer.default_evening_qty);
    if (!qty) return setError(`No ${shift.toLowerCase()} default quantity set for ${customer.customer_name}`);
    try {
      await customerMilkService.addDelivery({ customerId:customer.id, date, shift, milkType:'Mixed', quantity:qty, rate:Number(customer.default_rate_per_liter||0), status:'Delivered' });
      setSuccess(`${customer.customer_name}: ${qty} L added`); await load();
    } catch(e){ setError(e.message); }
  };

  const savePayment = async e => {
    e.preventDefault(); setError('');
    try { await customerMilkService.addPayment(paymentForm); setModal(null); setPaymentForm({...emptyPayment,date:todayIST()}); setSuccess('Customer payment recorded'); await load(); }
    catch(e){ setError(e.message); }
  };

  const openLedger = async id => {
    setError('');
    try { const data = await customerMilkService.getCustomerLedger(id); setLedgerDetail(data); setModal('ledger'); }
    catch(e){ setError(e.message); }
  };

  const removeDelivery = async id => {
    if (!window.confirm('Delete this milk delivery entry?')) return;
    try { await customerMilkService.deleteDelivery(id); await load(); }
    catch(e){ setError(e.message); }
  };

  const removePayment = async id => {
    if (!window.confirm('Delete this payment entry?')) return;
    try { await customerMilkService.deletePayment(id); await load(); }
    catch(e){ setError(e.message); }
  };

  const tabs = canManage ? ['overview','customers','deliveries','payments','ledger'] : ['customers','deliveries'];

  return <div className="customer-milk-page">
    <div className="customer-milk-toolbar">
      <div className="customer-milk-tabs">
        {tabs.map(t => <button key={t} className={`customer-milk-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{({overview:'Overview',customers:'Customers',deliveries:'Daily Delivery',payments:'Payments',ledger:'Ledger & Dues'})[t]}</button>)}
      </div>
      <button className="btn btn-secondary" onClick={load}><RefreshCw size={16}/> Refresh</button>
    </div>

    {error && <div className="customer-milk-error">{error}</div>}
    {success && <div className="customer-milk-success">{success}</div>}

    {canManage && <div className="customer-milk-summary">
      <div className="metric"><span>Active Customers</span><strong>{customers.filter(c=>c.status==='active').length}</strong></div>
      <div className="metric"><span>Today Milk Given</span><strong>{liters(todayLiters)}</strong></div>
      <div className="metric"><span>Today Sales</span><strong>{money(todaySales)}</strong></div>
      <div className="metric"><span>Total Outstanding</span><strong>{money(totalOutstanding)}</strong></div>
    </div>}

    {loading && <div className="customer-milk-panel customer-milk-empty">Loading...</div>}

    {!loading && tab==='overview' && canManage && <div className="customer-milk-grid">
      <div className="customer-milk-panel">
        <div className="customer-milk-panel-head"><h3>Today Distribution</h3><button className="btn btn-primary" onClick={()=>{setDeliveryForm({...emptyDelivery,date,shift});setModal('delivery')}}><Plus size={16}/> Add Delivery</button></div>
        <div className="customer-milk-form-grid" style={{marginBottom:12}}>
          <div><label className="form-label">Date</label><input className="form-control" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div><label className="form-label">Shift</label><select className="form-control" value={shift} onChange={e=>setShift(e.target.value)}><option>Morning</option><option>Evening</option></select></div>
        </div>
        {customers.filter(c=>c.status==='active').slice(0,12).map(c => <div className="customer-milk-route" key={c.id}>
          <div><div className="customer-milk-name">#{c.customer_code} {c.customer_name}</div><div className="customer-milk-sub">{c.village || c.address || 'No address'}</div></div>
          <div>{shift==='Morning'?liters(c.default_morning_qty):liters(c.default_evening_qty)}</div>
          <div>{money(c.default_rate_per_liter)}/L</div>
          <div>{money((shift==='Morning'?c.default_morning_qty:c.default_evening_qty)*c.default_rate_per_liter)}</div>
          <button className="customer-milk-mini-btn primary" onClick={()=>quickDeliver(c)}>Add</button>
        </div>)}
      </div>
      <div className="customer-milk-panel">
        <div className="customer-milk-panel-head"><h3>Highest Dues</h3></div>
        {[...ledger].sort((a,b)=>Number(b.outstanding_amount)-Number(a.outstanding_amount)).slice(0,10).map(x => <div className="customer-milk-route" key={x.customer_id}>
          <div><div className="customer-milk-name">#{x.customer_code} {x.customer_name}</div><div className="customer-milk-sub">{x.billing_cycle}</div></div>
          <div>{liters(x.total_liters)}</div><div>{money(x.total_sales)}</div><div><strong>{money(x.outstanding_amount)}</strong></div>
          <button className="customer-milk-mini-btn" onClick={()=>openLedger(x.customer_id)}>Ledger</button>
        </div>)}
      </div>
    </div>}

    {!loading && tab==='customers' && <div className="customer-milk-panel">
      <div className="customer-milk-panel-head">
        <h3>Customer Master</h3>
        {canManage && <button className="btn btn-primary" onClick={()=>{setCustomerForm(emptyCustomer);setModal('customer')}}><Plus size={16}/> New Customer</button>}
      </div>
      <div className="input-with-icon" style={{maxWidth:420,marginBottom:12}}><Search size={17} className="input-icon"/><input className="form-control" placeholder="Search name, code, mobile, village" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="customer-milk-table-wrap"><table className="customer-milk-table"><thead><tr><th>Customer</th><th>Type</th><th>Morning</th><th>Evening</th><th>Rate</th><th>Billing</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {filteredCustomers.map(c=><tr key={c.id}><td><div className="customer-milk-name">#{c.customer_code} {c.customer_name}</div><div className="customer-milk-sub">{c.mobile || ''} {c.village ? `• ${c.village}` : ''}</div></td><td>{c.customer_type}</td><td>{liters(c.default_morning_qty)}</td><td>{liters(c.default_evening_qty)}</td><td>{money(c.default_rate_per_liter)}</td><td>{c.billing_cycle}</td><td><span className={`customer-milk-badge ${c.status==='active'?'good':'warn'}`}>{c.status}</span></td><td>{canManage?<button className="customer-milk-mini-btn" onClick={()=>openLedger(c.id)}>Ledger</button>:<span>—</span>}</td></tr>)}
      </tbody></table></div>
    </div>}

    {!loading && tab==='deliveries' && <div className="customer-milk-panel">
      <div className="customer-milk-panel-head"><h3>Milk Given to Customers</h3><button className="btn btn-primary" onClick={()=>{setDeliveryForm({...emptyDelivery,date,shift});setModal('delivery')}}><Plus size={16}/> Add Delivery</button></div>
      <div className="customer-milk-form-grid" style={{marginBottom:12}}><div><label className="form-label">Date</label><input className="form-control" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div><label className="form-label">Shift</label><select className="form-control" value={shift} onChange={e=>setShift(e.target.value)}><option>Morning</option><option>Evening</option></select></div></div>
      <div className="customer-milk-table-wrap"><table className="customer-milk-table"><thead><tr><th>Customer</th><th>Date</th><th>Shift</th><th>Milk</th><th>Qty</th><th>Rate</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
        {deliveries.map(d=><tr key={d.id}><td><div className="customer-milk-name">#{d.customers?.customer_code} {d.customers?.customer_name}</div></td><td>{d.delivery_date}</td><td>{d.shift}</td><td>{d.milk_type}</td><td>{liters(d.quantity_liters)}</td><td>{money(d.rate_per_liter)}</td><td>{money(d.amount)}</td><td><span className={`customer-milk-badge ${d.delivery_status==='Delivered'?'good':'warn'}`}>{d.delivery_status}</span></td><td>{canManage&&<button className="customer-milk-mini-btn danger" onClick={()=>removeDelivery(d.id)}><Trash2 size={14}/></button>}</td></tr>)}
      </tbody></table></div>
      {!deliveries.length && <div className="customer-milk-empty">No customer milk deliveries for this date.</div>}
    </div>}

    {!loading && tab==='payments' && canManage && <div className="customer-milk-panel">
      <div className="customer-milk-panel-head"><h3>Customer Payments</h3><button className="btn btn-primary" onClick={()=>{setPaymentForm(emptyPayment);setModal('payment')}}><Plus size={16}/> Record Payment</button></div>
      <div className="customer-milk-table-wrap"><table className="customer-milk-table"><thead><tr><th>Customer</th><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Notes</th><th></th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td className="customer-milk-name">#{p.customers?.customer_code} {p.customers?.customer_name}</td><td>{p.payment_date}</td><td>{money(p.amount_paid)}</td><td>{p.payment_mode}</td><td>{p.reference_no||'—'}</td><td>{p.notes||'—'}</td><td>{isOwner&&<button className="customer-milk-mini-btn danger" onClick={()=>removePayment(p.id)}><Trash2 size={14}/></button>}</td></tr>)}</tbody></table></div>
    </div>}

    {!loading && tab==='ledger' && canManage && <div className="customer-milk-panel">
      <div className="customer-milk-panel-head"><h3>Customer Ledger & Outstanding</h3></div>
      <div className="customer-milk-table-wrap"><table className="customer-milk-table"><thead><tr><th>Customer</th><th>Total Milk</th><th>Milk Sales</th><th>Opening</th><th>Paid</th><th>Outstanding</th><th></th></tr></thead><tbody>{ledger.map(x=><tr key={x.customer_id}><td><div className="customer-milk-name">#{x.customer_code} {x.customer_name}</div><div className="customer-milk-sub">{x.mobile||''}</div></td><td>{liters(x.total_liters)}</td><td>{money(x.total_sales)}</td><td>{money(x.opening_balance)}</td><td>{money(x.total_paid)}</td><td><strong>{money(x.outstanding_amount)}</strong></td><td><button className="customer-milk-mini-btn" onClick={()=>openLedger(x.customer_id)}>View</button></td></tr>)}</tbody></table></div>
    </div>}

    {modal==='customer' && <Modal title="Add Customer" onClose={()=>setModal(null)}><form onSubmit={saveCustomer}><div className="customer-milk-form-grid">
      <Field label="Customer Name"><input className="form-control" value={customerForm.customerName} onChange={e=>setCustomerForm({...customerForm,customerName:e.target.value})} required/></Field>
      <Field label="Mobile"><input className="form-control" value={customerForm.mobile} onChange={e=>setCustomerForm({...customerForm,mobile:e.target.value})}/></Field>
      <Field label="Customer Type"><select className="form-control" value={customerForm.customerType} onChange={e=>setCustomerForm({...customerForm,customerType:e.target.value})}>{['Household','Shop','Hotel','Restaurant','Institution','Other'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Village"><input className="form-control" value={customerForm.village} onChange={e=>setCustomerForm({...customerForm,village:e.target.value})}/></Field>
      <Field label="Address" cls="wide"><input className="form-control" value={customerForm.address} onChange={e=>setCustomerForm({...customerForm,address:e.target.value})}/></Field>
      <Field label="Default Rate ₹/L"><input className="form-control" type="number" step="0.01" value={customerForm.defaultRate} onChange={e=>setCustomerForm({...customerForm,defaultRate:e.target.value})} required/></Field>
      <Field label="Morning Qty L"><input className="form-control" type="number" step="0.001" value={customerForm.morningQty} onChange={e=>setCustomerForm({...customerForm,morningQty:e.target.value})}/></Field>
      <Field label="Evening Qty L"><input className="form-control" type="number" step="0.001" value={customerForm.eveningQty} onChange={e=>setCustomerForm({...customerForm,eveningQty:e.target.value})}/></Field>
      <Field label="Billing Cycle"><select className="form-control" value={customerForm.billingCycle} onChange={e=>setCustomerForm({...customerForm,billingCycle:e.target.value})}>{['Daily','Weekly','10 Day','Monthly','Manual'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Opening Due / Credit ₹"><input className="form-control" type="number" step="0.01" value={customerForm.openingBalance} onChange={e=>setCustomerForm({...customerForm,openingBalance:e.target.value})}/></Field>
      <Field label="Start Date"><input className="form-control" type="date" value={customerForm.startDate} onChange={e=>setCustomerForm({...customerForm,startDate:e.target.value})}/></Field>
    </div><button className="btn btn-primary" style={{marginTop:16}} type="submit">Save Customer</button></form></Modal>}

    {modal==='delivery' && <Modal title="Add Milk Delivery" onClose={()=>setModal(null)}><form onSubmit={saveDelivery}><div className="customer-milk-form-grid">
      <Field label="Customer" cls="wide"><select className="form-control" value={deliveryForm.customerId} onChange={e=>chooseCustomerForDelivery(e.target.value)} required><option value="">Select customer</option>{customers.filter(c=>c.status==='active').map(c=><option key={c.id} value={c.id}>#{c.customer_code} {c.customer_name}</option>)}</select></Field>
      <Field label="Date"><input className="form-control" type="date" value={deliveryForm.date} onChange={e=>setDeliveryForm({...deliveryForm,date:e.target.value})}/></Field>
      <Field label="Shift"><select className="form-control" value={deliveryForm.shift} onChange={e=>{const s=e.target.value;setDeliveryForm({...deliveryForm,shift:s,quantity:selectedCustomer?String(s==='Morning'?selectedCustomer.default_morning_qty:selectedCustomer.default_evening_qty):deliveryForm.quantity})}}><option>Morning</option><option>Evening</option></select></Field>
      <Field label="Milk Type"><select className="form-control" value={deliveryForm.milkType} onChange={e=>setDeliveryForm({...deliveryForm,milkType:e.target.value})}>{['Cow','Buffalo','Mixed','Other'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Quantity L"><input className="form-control" type="number" step="0.001" min="0.001" value={deliveryForm.quantity} onChange={e=>setDeliveryForm({...deliveryForm,quantity:e.target.value})} required/></Field>
      <Field label="Rate ₹/L"><input className="form-control" type="number" step="0.01" min="0" value={deliveryForm.rate} onChange={e=>setDeliveryForm({...deliveryForm,rate:e.target.value})} required/></Field>
      <Field label="Status"><select className="form-control" value={deliveryForm.status} onChange={e=>setDeliveryForm({...deliveryForm,status:e.target.value})}>{['Delivered','Skipped','Returned'].map(x=><option key={x}>{x}</option>)}</select></Field>
    </div><div className="customer-milk-alert" style={{marginTop:14}}>Amount: {money(Number(deliveryForm.quantity||0)*Number(deliveryForm.rate||0))}</div><button className="btn btn-primary" style={{marginTop:16}} type="submit">Save Delivery</button></form></Modal>}

    {modal==='payment' && <Modal title="Record Customer Payment" onClose={()=>setModal(null)}><form onSubmit={savePayment}><div className="customer-milk-form-grid">
      <Field label="Customer" cls="wide"><select className="form-control" value={paymentForm.customerId} onChange={e=>setPaymentForm({...paymentForm,customerId:e.target.value})} required><option value="">Select customer</option>{customers.filter(c=>c.status==='active').map(c=><option key={c.id} value={c.id}>#{c.customer_code} {c.customer_name}</option>)}</select></Field>
      <Field label="Date"><input className="form-control" type="date" value={paymentForm.date} onChange={e=>setPaymentForm({...paymentForm,date:e.target.value})}/></Field>
      <Field label="Amount ₹"><input className="form-control" type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:e.target.value})} required/></Field>
      <Field label="Mode"><select className="form-control" value={paymentForm.mode} onChange={e=>setPaymentForm({...paymentForm,mode:e.target.value})}>{['Cash','UPI','Bank Transfer','Cheque','Other'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Reference"><input className="form-control" value={paymentForm.referenceNo} onChange={e=>setPaymentForm({...paymentForm,referenceNo:e.target.value})}/></Field>
      <Field label="Notes" cls="wide"><input className="form-control" value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm,notes:e.target.value})}/></Field>
    </div><button className="btn btn-primary" style={{marginTop:16}} type="submit">Save Payment</button></form></Modal>}

    {modal==='ledger' && ledgerDetail && <Modal title={`Ledger • ${ledgerDetail.customer?.customer_name || ''}`} onClose={()=>setModal(null)}>
      <div className="customer-milk-alert" style={{marginBottom:12}}>Closing outstanding: <strong>{money(ledgerDetail.closingBalance)}</strong></div>
      <div className="customer-milk-ledger-row header"><div>Date</div><div>Details</div><div>Debit</div><div>Credit</div><div>Balance</div></div>
      {ledgerDetail.events.map(e=><div className="customer-milk-ledger-row" key={`${e.type}-${e.id}`}><div>{e.date}</div><div><strong>{e.type}</strong><div className="customer-milk-sub">{e.description}</div></div><div>{e.debit?money(e.debit):'—'}</div><div>{e.credit?money(e.credit):'—'}</div><div><strong>{money(e.balance)}</strong></div></div>)}
      {!ledgerDetail.events.length && <div className="customer-milk-empty">No transactions yet.</div>}
    </Modal>}
  </div>;
}

function Field({label,children,cls=''}){return <div className={cls}><label className="form-label">{label}</label>{children}</div>}
function Modal({title,onClose,children}){return <div className="customer-milk-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="customer-milk-modal"><div className="customer-milk-modal-head"><h3>{title}</h3><button className="customer-milk-close" onClick={onClose}>×</button></div>{children}</div></div>}
