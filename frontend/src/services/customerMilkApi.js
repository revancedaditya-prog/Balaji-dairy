import supabase from '../lib/supabase';

const qs = (pairs) => pairs
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('&');

const writeHeaders = { Prefer: 'return=representation' };
const single = (rows) => Array.isArray(rows) ? rows[0] : rows;

export const todayIST = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const currentUserId = () => supabase.getSession()?.user?.id || null;

export const customerMilkService = {
  async getCustomers({ status, search } = {}) {
    const params = [['select', '*'], ['order', 'customer_code.asc']];
    if (status) params.push(['status', `eq.${status}`]);
    if (search?.trim()) {
      const s = search.trim();
      if (/^\d+$/.test(s)) params.push(['or', `(customer_code.eq.${s},mobile.ilike.*${s}*)`]);
      else params.push(['or', `(customer_name.ilike.*${s}*,village.ilike.*${s}*,address.ilike.*${s}*)`]);
    }
    return supabase.query('customers', qs(params));
  },

  async addCustomer(data) {
    const body = {
      customer_name: data.customerName.trim(),
      mobile: data.mobile?.trim() || null,
      address: data.address?.trim() || null,
      village: data.village?.trim() || null,
      customer_type: data.customerType || 'Household',
      default_rate_per_liter: Number(data.defaultRate || 0),
      default_morning_qty: Number(data.morningQty || 0),
      default_evening_qty: Number(data.eveningQty || 0),
      billing_cycle: data.billingCycle || 'Monthly',
      opening_balance: Number(data.openingBalance || 0),
      status: data.status || 'active',
      start_date: data.startDate || todayIST(),
      notes: data.notes?.trim() || null,
      created_by: currentUserId(),
    };
    const row = single(await supabase.query('customers', '', {
      method: 'POST', headers: writeHeaders, body: JSON.stringify(body)
    }));
    try { await supabase.rpc('log_audit', { p_action: 'CUSTOMER_ADD', p_target_type: 'customer', p_target_id: row.id, p_new_value: row }); } catch {}
    return row;
  },

  async updateCustomer(id, data) {
    const body = {};
    const map = {
      customerName: 'customer_name', mobile: 'mobile', address: 'address', village: 'village',
      customerType: 'customer_type', defaultRate: 'default_rate_per_liter', morningQty: 'default_morning_qty',
      eveningQty: 'default_evening_qty', billingCycle: 'billing_cycle', openingBalance: 'opening_balance',
      status: 'status', startDate: 'start_date', notes: 'notes'
    };
    Object.entries(map).forEach(([from, to]) => {
      if (data[from] !== undefined) body[to] = ['defaultRate','morningQty','eveningQty','openingBalance'].includes(from) ? Number(data[from] || 0) : data[from];
    });
    const row = single(await supabase.query('customers', qs([['id', `eq.${id}`]]), {
      method: 'PATCH', headers: writeHeaders, body: JSON.stringify(body)
    }));
    try { await supabase.rpc('log_audit', { p_action: 'CUSTOMER_UPDATE', p_target_type: 'customer', p_target_id: id, p_new_value: row }); } catch {}
    return row;
  },

  async deleteCustomer(id) {
    await supabase.query('customers', qs([['id', `eq.${id}`]]), { method: 'DELETE' });
  },

  async getDeliveries({ date, startDate, endDate, customerId, shift, limit = 300 } = {}) {
    const params = [['select', '*,customers(customer_code,customer_name)'], ['order', 'delivery_date.desc,created_at.desc'], ['limit', limit]];
    if (date) params.push(['delivery_date', `eq.${date}`]);
    if (startDate) params.push(['delivery_date', `gte.${startDate}`]);
    if (endDate) params.push(['delivery_date', `lte.${endDate}`]);
    if (customerId) params.push(['customer_id', `eq.${customerId}`]);
    if (shift) params.push(['shift', `eq.${shift}`]);
    return supabase.query('customer_milk_deliveries', qs(params));
  },

  async addDelivery(data) {
    const body = {
      customer_id: data.customerId,
      delivery_date: data.date || todayIST(),
      shift: data.shift || 'Morning',
      milk_type: data.milkType || 'Mixed',
      quantity_liters: Number(data.quantity),
      rate_per_liter: Number(data.rate),
      delivery_status: data.status || 'Delivered',
      notes: data.notes?.trim() || null,
      created_by: currentUserId(),
    };
    const row = single(await supabase.query('customer_milk_deliveries', '', {
      method: 'POST', headers: writeHeaders, body: JSON.stringify(body)
    }));
    try { await supabase.rpc('log_audit', { p_action: 'CUSTOMER_MILK_DELIVERY_ADD', p_target_type: 'customer_delivery', p_target_id: row.id, p_new_value: row }); } catch {}
    return row;
  },

  async updateDelivery(id, data) {
    const body = {};
    if (data.date !== undefined) body.delivery_date = data.date;
    if (data.shift !== undefined) body.shift = data.shift;
    if (data.milkType !== undefined) body.milk_type = data.milkType;
    if (data.quantity !== undefined) body.quantity_liters = Number(data.quantity);
    if (data.rate !== undefined) body.rate_per_liter = Number(data.rate);
    if (data.status !== undefined) body.delivery_status = data.status;
    if (data.notes !== undefined) body.notes = data.notes;
    return single(await supabase.query('customer_milk_deliveries', qs([['id', `eq.${id}`]]), {
      method: 'PATCH', headers: writeHeaders, body: JSON.stringify(body)
    }));
  },

  async deleteDelivery(id) {
    await supabase.query('customer_milk_deliveries', qs([['id', `eq.${id}`]]), { method: 'DELETE' });
  },

  async getPayments({ customerId, startDate, endDate, limit = 300 } = {}) {
    const params = [['select', '*,customers(customer_code,customer_name)'], ['order', 'payment_date.desc,created_at.desc'], ['limit', limit]];
    if (customerId) params.push(['customer_id', `eq.${customerId}`]);
    if (startDate) params.push(['payment_date', `gte.${startDate}`]);
    if (endDate) params.push(['payment_date', `lte.${endDate}`]);
    return supabase.query('customer_payments', qs(params));
  },

  async addPayment(data) {
    const body = {
      customer_id: data.customerId,
      payment_date: data.date || todayIST(),
      amount_paid: Number(data.amount),
      payment_mode: data.mode || 'Cash',
      reference_no: data.referenceNo?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: currentUserId(),
    };
    const row = single(await supabase.query('customer_payments', '', {
      method: 'POST', headers: writeHeaders, body: JSON.stringify(body)
    }));
    try { await supabase.rpc('log_audit', { p_action: 'CUSTOMER_PAYMENT_ADD', p_target_type: 'customer_payment', p_target_id: row.id, p_new_value: row }); } catch {}
    return row;
  },

  async deletePayment(id) {
    await supabase.query('customer_payments', qs([['id', `eq.${id}`]]), { method: 'DELETE' });
  },

  async getLedgerSummary() {
    return supabase.query('customer_ledger_summary', qs([['select', '*'], ['order', 'customer_code.asc']]));
  },

  async getCustomerLedger(customerId) {
    const [customers, deliveries, payments] = await Promise.all([
      supabase.query('customers', qs([['select', '*'], ['id', `eq.${customerId}`], ['limit', '1']])),
      this.getDeliveries({ customerId, limit: 1000 }),
      this.getPayments({ customerId, limit: 1000 }),
    ]);
    const customer = single(customers);
    let balance = Number(customer?.opening_balance || 0);
    const events = [
      ...deliveries.filter(d => d.delivery_status === 'Delivered').map(d => ({
        id: d.id, date: d.delivery_date, createdAt: d.created_at, type: 'Milk',
        description: `${d.shift} • ${Number(d.quantity_liters).toFixed(2)} L × ₹${Number(d.rate_per_liter).toFixed(2)}`,
        debit: Number(d.amount), credit: 0
      })),
      ...payments.map(p => ({
        id: p.id, date: p.payment_date, createdAt: p.created_at, type: 'Payment',
        description: `${p.payment_mode}${p.reference_no ? ` • ${p.reference_no}` : ''}`,
        debit: 0, credit: Number(p.amount_paid)
      }))
    ].sort((a, b) => `${a.date}|${a.createdAt}`.localeCompare(`${b.date}|${b.createdAt}`));
    const withBalance = events.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance: Number(balance.toFixed(2)) };
    });
    return { customer, events: withBalance.reverse(), closingBalance: Number(balance.toFixed(2)) };
  },
};

export default customerMilkService;
