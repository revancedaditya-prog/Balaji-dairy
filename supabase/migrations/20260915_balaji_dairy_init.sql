-- ==========================================================
-- BALAJI DAIRY MANAGEMENT SYSTEM — SUPABASE POSTGRESQL SCHEMA
-- PRODUCTION-GRADE MIGRATION & RLS POLICIES
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('owner', 'manager', 'worker')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dairy_name TEXT DEFAULT 'BALAJI DAIRY',
    dairy_hindi_name TEXT DEFAULT 'श्री बालाजी डेयरी',
    tagline TEXT DEFAULT 'Fresh Milk & Dairy Products',
    owner_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    fssai_number TEXT DEFAULT '',
    gst_number TEXT DEFAULT '',
    bill_footer_notes TEXT DEFAULT 'Thank you for your business! Please settle pending balance by due date.',
    morning_shift_start TEXT DEFAULT '05:00',
    evening_shift_start TEXT DEFAULT '16:00',
    variance_tolerance_liters NUMERIC DEFAULT 5,
    default_cow_rate NUMERIC DEFAULT 45,
    default_buffalo_rate NUMERIC DEFAULT 65,
    currency_symbol TEXT DEFAULT '₹',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUPPLIERS / FARMERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code INTEGER UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    father_name TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    village TEXT DEFAULT '',
    joining_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_village ON public.suppliers(village);

-- 4. MILK ENTRIES (COLLECTION)
CREATE TABLE IF NOT EXISTS public.milk_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code INTEGER NOT NULL REFERENCES public.suppliers(supplier_code) ON UPDATE CASCADE,
    supplier_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL CHECK (shift IN ('Morning', 'Evening')),
    time TEXT DEFAULT '',
    milk_quantity NUMERIC(10,2) NOT NULL CHECK (milk_quantity > 0),
    fat NUMERIC(4,2) DEFAULT 0,
    snf NUMERIC(4,2) DEFAULT 0,
    rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    remarks TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_entries_date_shift ON public.milk_entries(date, shift);
CREATE INDEX IF NOT EXISTS idx_milk_entries_supplier_date ON public.milk_entries(supplier_code, date);

-- 5. RATE CHART
CREATE TABLE IF NOT EXISTS public.rate_chart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fat NUMERIC(4,2) NOT NULL,
    snf NUMERIC(4,2) NOT NULL,
    rate NUMERIC(10,2) NOT NULL CHECK (rate > 0),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fat, snf, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_rate_chart_fat_snf ON public.rate_chart(fat, snf);

-- 6. SUPPLIER PAYMENTS
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code INTEGER NOT NULL REFERENCES public.suppliers(supplier_code) ON UPDATE CASCADE,
    supplier_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque')),
    reference_number TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sup_payments_code_date ON public.supplier_payments(supplier_code, date);

-- 7. CUSTOMERS MASTER
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code INTEGER UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    mobile TEXT DEFAULT '',
    address TEXT DEFAULT '',
    village TEXT DEFAULT '',
    customer_type TEXT DEFAULT 'Household' CHECK (customer_type IN ('Household', 'Shop', 'Hotel', 'Restaurant', 'Sweet Shop', 'Institution', 'Other')),
    milk_type TEXT DEFAULT 'Mixed' CHECK (milk_type IN ('Cow', 'Buffalo', 'Mixed')),
    morning_default_qty NUMERIC(8,2) DEFAULT 1,
    evening_default_qty NUMERIC(8,2) DEFAULT 0,
    default_rate NUMERIC(10,2) DEFAULT 60,
    billing_cycle TEXT DEFAULT 'Monthly' CHECK (billing_cycle IN ('Daily', 'Weekly', '10-day', 'Monthly')),
    opening_balance NUMERIC(12,2) DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);

-- 8. CUSTOMER DELIVERIES (ROUTE SHEET)
CREATE TABLE IF NOT EXISTS public.customer_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code INTEGER NOT NULL REFERENCES public.customers(customer_code) ON UPDATE CASCADE,
    customer_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL CHECK (shift IN ('Morning', 'Evening')),
    milk_type TEXT DEFAULT 'Mixed' CHECK (milk_type IN ('Cow', 'Buffalo', 'Mixed')),
    quantity NUMERIC(8,2) NOT NULL CHECK (quantity >= 0),
    rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'Delivered' CHECK (status IN ('Delivered', 'Skipped', 'Returned', 'Changed Qty')),
    remarks TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_code, date, shift)
);

CREATE INDEX IF NOT EXISTS idx_cust_del_date_shift ON public.customer_deliveries(date, shift);
CREATE INDEX IF NOT EXISTS idx_cust_del_code_date ON public.customer_deliveries(customer_code, date);

-- 9. CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS public.customer_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code INTEGER NOT NULL REFERENCES public.customers(customer_code) ON UPDATE CASCADE,
    customer_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_or_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    reference_number TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cust_payments_code_date ON public.customer_payments(customer_code, date);

-- 10. CUSTOMER BILLS (INVOICES)
CREATE TABLE IF NOT EXISTS public.customer_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT UNIQUE NOT NULL,
    customer_code INTEGER NOT NULL REFERENCES public.customers(customer_code) ON UPDATE CASCADE,
    customer_name TEXT NOT NULL,
    mobile TEXT DEFAULT '',
    village TEXT DEFAULT '',
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    previous_balance NUMERIC(12,2) DEFAULT 0,
    total_litres NUMERIC(10,2) DEFAULT 0,
    milk_amount NUMERIC(12,2) DEFAULT 0,
    payments_received NUMERIC(12,2) DEFAULT 0,
    adjustments NUMERIC(12,2) DEFAULT 0,
    final_payable NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'Partially Paid')),
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INTERNAL MILK USE
CREATE TABLE IF NOT EXISTS public.internal_milk_use (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL CHECK (shift IN ('Morning', 'Evening')),
    purpose TEXT NOT NULL CHECK (purpose IN ('Paneer', 'Khoya', 'Kulfi', 'Staff Tea', 'Quality Samples', 'Wastage', 'Other')),
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    product_yield_kg NUMERIC(8,2) DEFAULT 0,
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_use_date ON public.internal_milk_use(date);

-- 12. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('LPG', 'Electricity', 'Diesel', 'Transport', 'Labour', 'Repairs', 'Packaging', 'Cleaning', 'Milk Testing', 'Maintenance', 'Miscellaneous')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    reference_number TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- 13. MILK RECONCILIATION
CREATE TABLE IF NOT EXISTS public.milk_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL DEFAULT 'Full Day' CHECK (shift IN ('Morning', 'Evening', 'Full Day')),
    opening_milk NUMERIC(10,2) DEFAULT 0,
    farmer_collection NUMERIC(10,2) DEFAULT 0,
    other_incoming NUMERIC(10,2) DEFAULT 0,
    total_available NUMERIC(10,2) DEFAULT 0,
    customer_sales NUMERIC(10,2) DEFAULT 0,
    internal_use NUMERIC(10,2) DEFAULT 0,
    wastage NUMERIC(10,2) DEFAULT 0,
    closing_milk NUMERIC(10,2) DEFAULT 0,
    total_accounted NUMERIC(10,2) DEFAULT 0,
    variance NUMERIC(10,2) DEFAULT 0,
    is_reconciled BOOLEAN DEFAULT true,
    notes TEXT DEFAULT '',
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, shift)
);

-- 14. QUALITY TESTS
CREATE TABLE IF NOT EXISTS public.quality_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code INTEGER REFERENCES public.suppliers(supplier_code) ON UPDATE CASCADE,
    supplier_name TEXT DEFAULT '',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT DEFAULT 'Morning' CHECK (shift IN ('Morning', 'Evening')),
    fat NUMERIC(4,2) DEFAULT 0,
    snf NUMERIC(4,2) DEFAULT 0,
    clr_lactometer NUMERIC(5,2) DEFAULT 0,
    temperature NUMERIC(5,2) DEFAULT 0,
    acidity NUMERIC(4,2) DEFAULT 0,
    added_water_percent NUMERIC(5,2) DEFAULT 0,
    urea_test BOOLEAN DEFAULT false,
    starch_test BOOLEAN DEFAULT false,
    detergent_test BOOLEAN DEFAULT false,
    neutralizer_test BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Passed' CHECK (status IN ('Passed', 'Failed', 'Suspect')),
    remarks TEXT DEFAULT '',
    tested_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    diff JSONB DEFAULT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_milk_use ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milk_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- General Authenticated Access Policies
CREATE POLICY "Allow authenticated users to read business data"
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read milk entries"
ON public.milk_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert milk entries"
ON public.milk_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow managers and owners to update/delete milk entries"
ON public.milk_entries FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Allow authenticated users to read customer deliveries"
ON public.customer_deliveries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert deliveries"
ON public.customer_deliveries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated to read rate chart"
ON public.rate_chart FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only owners and managers can modify rate chart"
ON public.rate_chart FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Only owners and managers can access financial payments"
ON public.supplier_payments FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Only owners and managers can access customer payments"
ON public.customer_payments FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Only owners and managers can access expenses"
ON public.expenses FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Only owners and managers can access reconciliation"
ON public.milk_reconciliations FOR ALL TO authenticated
USING (public.get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Only owners can manage profiles and audit logs"
ON public.profiles FOR ALL TO authenticated
USING (public.get_user_role() = 'owner');

CREATE POLICY "Only owners can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.get_user_role() = 'owner');
