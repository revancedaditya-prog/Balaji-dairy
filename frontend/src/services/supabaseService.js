import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Helper for Indian Standard Date
const getISTDate = () => {
  const d = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  return new Date(d.getTime() + offset).toISOString().split('T')[0];
};

export const supabaseAuthService = {
  login: async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Fetch user profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      success: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email.split('@')[0],
        role: profile?.role || 'worker',
        status: profile?.status || 'active',
      },
    };
  },
  getMe: async () => {
    if (!isSupabaseConfigured) return { success: false };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email.split('@')[0],
        role: profile?.role || 'worker',
        status: profile?.status || 'active',
      },
    };
  },
  logout: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  },
  changePassword: async (oldPassword, newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true, message: 'Password updated successfully' };
  },
};

export const supabaseSupplierService = {
  getSuppliers: async (filters = {}) => {
    let query = supabase.from('suppliers').select('*').order('supplier_code', { ascending: true });
    if (filters.search) {
      query = query.or(`supplier_name.ilike.%${filters.search}%,village.ilike.%${filters.search}%`);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return {
      success: true,
      data: data.map((s) => ({
        _id: s.id,
        supplierCode: s.supplier_code,
        supplierName: s.supplier_name,
        fatherName: s.father_name,
        mobile: s.mobile,
        village: s.village,
        status: s.status,
        joiningDate: s.joining_date,
        notes: s.notes,
      })),
    };
  },
  getSupplierByCode: async (code) => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('supplier_code', code)
      .single();
    if (error || !data) return { success: false, data: null };
    return {
      success: true,
      data: {
        _id: data.id,
        supplierCode: data.supplier_code,
        supplierName: data.supplier_name,
        mobile: data.mobile,
        village: data.village,
        status: data.status,
      },
    };
  },
  addSupplier: async (data) => {
    const payload = {
      supplier_code: Number(data.supplierCode),
      supplier_name: data.supplierName,
      father_name: data.fatherName || '',
      mobile: data.mobile || '',
      village: data.village || '',
      status: data.status || 'active',
      notes: data.notes || '',
    };
    const { data: inserted, error } = await supabase.from('suppliers').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data: inserted };
  },
  updateSupplier: async (id, data) => {
    const payload = {
      supplier_name: data.supplierName,
      father_name: data.fatherName,
      mobile: data.mobile,
      village: data.village,
      status: data.status,
      notes: data.notes,
    };
    const { data: updated, error } = await supabase.from('suppliers').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: updated };
  },
  deleteSupplier: async (id) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: 'Supplier deleted successfully' };
  },
};

export const supabaseMilkEntryService = {
  getEntries: async (filters = {}) => {
    let query = supabase.from('milk_entries').select('*').order('created_at', { ascending: false });
    if (filters.date) query = query.eq('date', filters.date);
    if (filters.shift) query = query.eq('shift', filters.shift);
    if (filters.supplierCode) query = query.eq('supplier_code', filters.supplierCode);

    const { data, error } = await query;
    if (error) throw error;
    return {
      success: true,
      data: data.map((e) => ({
        _id: e.id,
        supplierCode: e.supplier_code,
        supplierName: e.supplier_name,
        date: e.date,
        shift: e.shift,
        time: e.time,
        milkQuantity: Number(e.milk_quantity),
        fat: Number(e.fat),
        snf: Number(e.snf),
        rate: Number(e.rate),
        amount: Number(e.amount),
        remarks: e.remarks,
      })),
    };
  },
  addEntry: async (data) => {
    const payload = {
      supplier_code: Number(data.supplierCode),
      supplier_name: data.supplierName,
      date: data.date || getISTDate(),
      shift: data.shift,
      time: data.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      milk_quantity: Number(data.milkQuantity),
      fat: Number(data.fat) || 0,
      snf: Number(data.snf) || 0,
      rate: Number(data.rate),
      amount: Number(data.amount),
      remarks: data.remarks || '',
    };
    const { data: inserted, error } = await supabase.from('milk_entries').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data: inserted };
  },
  deleteEntry: async (id) => {
    const { error } = await supabase.from('milk_entries').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: 'Entry deleted' };
  },
};

export const supabaseCustomerService = {
  getCustomers: async (filters = {}) => {
    let query = supabase.from('customers').select('*').order('customer_code', { ascending: true });
    if (filters.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,village.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return {
      success: true,
      data: data.map((c) => ({
        _id: c.id,
        customerCode: c.customer_code,
        customerName: c.customer_name,
        mobile: c.mobile,
        address: c.address,
        village: c.village,
        customerType: c.customer_type,
        milkType: c.milk_type,
        morningDefaultQty: Number(c.morning_default_qty),
        eveningDefaultQty: Number(c.evening_default_qty),
        defaultRate: Number(c.default_rate),
        billingCycle: c.billing_cycle,
        openingBalance: Number(c.opening_balance),
        status: c.status,
      })),
    };
  },
  createCustomer: async (data) => {
    const payload = {
      customer_code: Number(data.customerCode),
      customer_name: data.customerName,
      mobile: data.mobile || '',
      address: data.address || '',
      village: data.village || '',
      customer_type: data.customerType || 'Household',
      milk_type: data.milkType || 'Mixed',
      morning_default_qty: Number(data.morningDefaultQty) || 0,
      evening_default_qty: Number(data.eveningDefaultQty) || 0,
      default_rate: Number(data.defaultRate) || 60,
      billing_cycle: data.billingCycle || 'Monthly',
      opening_balance: Number(data.openingBalance) || 0,
      status: data.status || 'active',
      notes: data.notes || '',
    };
    const { data: inserted, error } = await supabase.from('customers').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data: inserted };
  },
  updateCustomer: async (id, data) => {
    const payload = {
      customer_name: data.customerName,
      mobile: data.mobile,
      address: data.address,
      village: data.village,
      customer_type: data.customerType,
      milk_type: data.milkType,
      morning_default_qty: Number(data.morningDefaultQty),
      evening_default_qty: Number(data.eveningDefaultQty),
      default_rate: Number(data.defaultRate),
      billing_cycle: data.billingCycle,
      opening_balance: Number(data.openingBalance),
      status: data.status,
    };
    const { data: updated, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: updated };
  },
  deleteCustomer: async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: 'Customer deleted' };
  },
};

export const supabaseDeliveryService = {
  getDailyRouteSheet: async ({ date = getISTDate(), shift = 'Morning' }) => {
    const { data: customers } = await supabase.from('customers').select('*').eq('status', 'active').order('customer_code', { ascending: true });
    const { data: deliveries } = await supabase.from('customer_deliveries').select('*').eq('date', date).eq('shift', shift);

    const delMap = {};
    (deliveries || []).forEach((d) => {
      delMap[d.customer_code] = d;
    });

    const routeItems = (customers || []).map((c) => {
      const defaultQty = shift === 'Morning' ? Number(c.morning_default_qty) : Number(c.evening_default_qty);
      const existing = delMap[c.customer_code];

      if (existing) {
        return {
          deliveryId: existing.id,
          customerCode: c.customer_code,
          customerName: c.customer_name,
          mobile: c.mobile,
          village: c.village,
          customerType: c.customer_type,
          milkType: existing.milk_type || c.milk_type,
          defaultQty,
          quantity: Number(existing.quantity),
          rate: Number(existing.rate),
          amount: Number(existing.amount),
          status: existing.status,
          remarks: existing.remarks || '',
          isSaved: true,
        };
      } else {
        const rate = Number(c.default_rate) || 0;
        const qty = defaultQty || 0;
        return {
          deliveryId: null,
          customerCode: c.customer_code,
          customerName: c.customer_name,
          mobile: c.mobile,
          village: c.village,
          customerType: c.customer_type,
          milkType: c.milk_type,
          defaultQty,
          quantity: qty,
          rate,
          amount: Math.round(qty * rate * 100) / 100,
          status: qty > 0 ? 'Delivered' : 'Skipped',
          remarks: '',
          isSaved: false,
        };
      }
    });

    return {
      success: true,
      date,
      shift,
      data: routeItems,
    };
  },
  bulkRecordDeliveries: async ({ date, shift, deliveries }) => {
    const payload = deliveries.map((d) => ({
      customer_code: Number(d.customerCode),
      customer_name: d.customerName,
      date,
      shift,
      milk_type: d.milkType || 'Mixed',
      quantity: Number(d.quantity) || 0,
      rate: Number(d.rate) || 0,
      amount: Number(d.amount) || 0,
      status: d.status || 'Delivered',
      remarks: d.remarks || '',
    }));

    const { data, error } = await supabase.from('customer_deliveries').upsert(payload, { onConflict: 'customer_code,date,shift' }).select();
    if (error) throw error;
    return { success: true, count: data.length, data };
  },
};
