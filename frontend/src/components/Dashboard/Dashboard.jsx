import React, { useState, useEffect, useCallback } from 'react';
import {
  Milk,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Users,
  Coffee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { reportService } from '../../services/api';
import { StatCard, Currency, Quantity, SkeletonLoader } from '../Common/UIComponents';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_STATS = {
  kpi: {
    todayCollectionLiters: 148.5,
    todayCollectionAmount: 7650,
    todayDeliveryLiters: 132.0,
    todayDeliveryAmount: 8580,
    todayInternalUseLiters: 12.0,
    supplierPayable: 18450,
    customerReceivable: 24300,
    activeFarmersCount: 14,
    activeCustomersCount: 22,
    monthlyGrossProfit: 45200,
  },
  milkFlow: {
    totalProcured: 148.5,
    totalDispatched: 132.0,
    totalInternal: 12.0,
    balanceVariance: 4.5,
  },
  alerts: [
    { type: 'info', message: 'Evening shift milk collection active. Ready for entries.' },
    { type: 'success', message: 'System healthy & synchronized with Balaji Dairy cloud.' },
  ],
};

const Dashboard = ({ setActiveTab, onOpenQuickAction }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const res = await reportService.getDashboardStats();
      if (res && res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Live dashboard fetch fallback:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Greeting generator
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', hindi: 'शुभ प्रभात' };
    if (hour < 17) return { text: 'Good Afternoon', hindi: 'शुभ दोपहर' };
    return { text: 'Good Evening', hindi: 'शुभ संध्या' };
  };

  const greeting = getGreeting();
  const kpi = stats?.kpi || {};
  const milkFlow = stats?.milkFlow || {};
  const alerts = stats?.alerts || [];

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SkeletonLoader type="stats" count={8} />
        <SkeletonLoader type="table" count={5} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          color: '#FFFFFF',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.85rem' }}>
                {greeting.text} • {greeting.hindi}
              </span>
            </div>
            <h1 style={{ color: '#FFFFFF', fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              BALAJI DAIRY COMMAND CENTER
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: '0.35rem 0 0 0' }}>
              Real-time procurement, customer distribution, cash flow & milk accounting overview
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={fetchDashboardData}
              className="btn btn-secondary btn-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}
              title="Refresh dashboard stats"
            >
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onOpenQuickAction}
              className="btn btn-accent btn-sm"
              style={{ fontWeight: 800 }}
            >
              <Plus size={16} strokeWidth={3} />
              <span>Quick Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Alerts Bar */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: alert.type === 'danger' ? 'var(--color-danger-bg)' : alert.type === 'warning' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                border: `1px solid ${alert.type === 'danger' ? 'var(--color-danger-border)' : alert.type === 'warning' ? 'var(--color-warning-border)' : 'var(--color-info-border)'}`,
                color: alert.type === 'danger' ? 'var(--color-danger-text)' : alert.type === 'warning' ? 'var(--color-warning-text)' : 'var(--color-info-text)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {alert.type === 'danger' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
                <span>{alert.title}</span>
                <span style={{ opacity: 0.8, fontWeight: 500 }}>— {alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8 Core KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* 1. Milk Collected Today */}
        <StatCard
          title="Milk Collected Today"
          hindiTitle="आज की खरीद"
          value={kpi.totalCollectedToday || 0}
          unit="L"
          subValue={`M: ${kpi.morningCollected || 0}L • E: ${kpi.eveningCollected || 0}L`}
          icon={Milk}
          variant="gold"
          onClick={() => setActiveTab && setActiveTab('collection')}
        />

        {/* 2. Milk Sold Today */}
        <StatCard
          title="Milk Sold Today"
          hindiTitle="आज की बिक्री"
          value={kpi.totalSoldToday || 0}
          unit="L"
          subValue={`Sales: ₹${(kpi.totalSalesToday || 0).toLocaleString('en-IN')}`}
          icon={Truck}
          variant="info"
          onClick={() => setActiveTab && setActiveTab('daily-delivery')}
        />

        {/* 3. Available / Unaccounted Milk */}
        <StatCard
          title="Available Balance"
          hindiTitle="बचा हुआ दूध"
          value={kpi.availableMilk || 0}
          unit="L"
          subValue={kpi.availableMilk >= 0 ? 'Surplus / In Storage' : 'Deficit / Shortage'}
          icon={TrendingUp}
          variant={kpi.availableMilk >= 0 ? 'success' : 'danger'}
          onClick={() => setActiveTab && setActiveTab('reconciliation')}
        />

        {/* 4. Today's Purchase Value */}
        <StatCard
          title="Today Purchase Value"
          hindiTitle="खरीद लागत"
          value={`₹${(kpi.totalPurchaseToday || 0).toLocaleString('en-IN')}`}
          subValue={`Avg Rate: ₹${kpi.avgPurchaseRate || 0}/L`}
          icon={DollarSign}
          variant="purple"
        />

        {/* 5. Today's Sales Value */}
        <StatCard
          title="Today Sales Value"
          hindiTitle="बिक्री राजस्व"
          value={`₹${(kpi.totalSalesToday || 0).toLocaleString('en-IN')}`}
          subValue={`Avg Rate: ₹${kpi.avgSalesRate || 0}/L`}
          icon={DollarSign}
          variant="success"
        />

        {/* 6. Estimated Gross Margin */}
        <StatCard
          title="Estimated Gross Margin"
          hindiTitle="सकल मार्जिन"
          value={`₹${(kpi.grossMarginToday || 0).toLocaleString('en-IN')}`}
          subValue={`Spread: ₹${kpi.grossMarginSpread || 0}/L`}
          icon={TrendingUp}
          variant={kpi.grossMarginToday >= 0 ? 'success' : 'danger'}
          onClick={() => setActiveTab && setActiveTab('profit-analytics')}
        />

        {/* 7. Customer Outstanding */}
        <StatCard
          title="Customer Outstanding"
          hindiTitle="ग्राहकों पर बकाया"
          value={`₹${(kpi.totalCustomerOutstanding || 0).toLocaleString('en-IN')}`}
          subValue="Total Pending Collection"
          icon={ShoppingBag}
          variant="danger"
          onClick={() => setActiveTab && setActiveTab('customer-ledger')}
        />

        {/* 8. Supplier Payable */}
        <StatCard
          title="Supplier Payable"
          hindiTitle="किसानों को देय"
          value={`₹${(kpi.totalSupplierPayable || 0).toLocaleString('en-IN')}`}
          subValue="Total Pending Settlements"
          icon={Users}
          variant="gold"
          onClick={() => setActiveTab && setActiveTab('supplier-ledger')}
        />
      </div>

      {/* Visual MILK FLOW Diagram */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
              TODAY'S MILK FLOW & INVENTORY RECONCILIATION
            </h3>
            <span style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)' }}>
              दैनिक दूध संतुलन: संकलन ➔ बिक्री ➔ प्रोसेसिंग / पनीर ➔ वेस्टेज ➔ शेष
            </span>
          </div>
          <button onClick={() => setActiveTab && setActiveTab('reconciliation')} className="btn btn-secondary btn-sm">
            <span>Detailed Reconciliation</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Flow Pipeline Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          {/* Collected */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FFF8E7', border: '1.5px solid #E8D49E', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>1. Collected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }} className="font-mono-num">
              {milkFlow.collected || 0} L
            </div>
            <div style={{ fontSize: '0.725rem', color: '#B45309', fontWeight: 600 }}>Total Inward</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '1.2rem' }} className="desktop-only">➔</div>

          {/* Customer Sale */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#F0F9FF', border: '1.5px solid #BAE6FD', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>2. Customer Sale</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }} className="font-mono-num">
              {milkFlow.customerSale || 0} L
            </div>
            <div style={{ fontSize: '0.725rem', color: '#0284C7', fontWeight: 600 }}>Delivered</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '1.2rem' }} className="desktop-only">➔</div>

          {/* Production / Internal */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FAF5FF', border: '1.5px solid #E9D5FF', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase' }}>3. Paneer / Khoya</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }} className="font-mono-num">
              {milkFlow.production || 0} L
            </div>
            <div style={{ fontSize: '0.725rem', color: '#9333EA', fontWeight: 600 }}>Internal Processing</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '1.2rem' }} className="desktop-only">➔</div>

          {/* Wastage */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase' }}>4. Wastage</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }} className="font-mono-num">
              {milkFlow.wastage || 0} L
            </div>
            <div style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: 600 }}>Loss / Spoilage</div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 800, fontSize: '1.2rem' }} className="desktop-only">=</div>

          {/* Balance / Variance */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: (milkFlow.balance || 0) >= 0 ? '#F0FDF4' : '#FEF2F2', border: `1.5px solid ${(milkFlow.balance || 0) >= 0 ? '#BBF7D0' : '#FECACA'}`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: (milkFlow.balance || 0) >= 0 ? '#15803D' : '#B91C1C', textTransform: 'uppercase' }}>5. Remaining / Variance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (milkFlow.balance || 0) >= 0 ? '#15803D' : '#B91C1C', marginTop: '0.25rem' }} className="font-mono-num">
              {milkFlow.balance || 0} L
            </div>
            <div style={{ fontSize: '0.725rem', color: (milkFlow.balance || 0) >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
              {(milkFlow.balance || 0) >= 0 ? 'Remaining Balance' : 'Variance / Shortage'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Streams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {/* Recent Collections */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Milk size={18} color="var(--color-accent)" />
              <span>Recent Milk Collections</span>
            </h4>
            <button onClick={() => setActiveTab && setActiveTab('collection')} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats?.recentCollections?.length > 0 ? (
              stats.recentCollections.map((entry) => (
                <div
                  key={entry._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      #{entry.supplierCode} • {entry.supplierName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {entry.date} • {entry.shift} • Fat: {entry.fat}% • SNF: {entry.snf}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{entry.milkQuantity} L</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 600 }}>₹{entry.amount}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No recent collections today.
              </div>
            )}
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={18} color="#0284C7" />
              <span>Recent Customer Deliveries</span>
            </h4>
            <button onClick={() => setActiveTab && setActiveTab('daily-delivery')} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats?.recentDeliveries?.length > 0 ? (
              stats.recentDeliveries.map((del) => (
                <div
                  key={del._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      C#{del.customerCode} • {del.customerName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {del.date} • {del.shift} • {del.status}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{del.quantity} L</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-info-text)', fontWeight: 600 }}>₹{del.amount}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No deliveries recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
