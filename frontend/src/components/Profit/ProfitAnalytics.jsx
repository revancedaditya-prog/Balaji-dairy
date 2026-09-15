import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  RefreshCw,
  Info
} from 'lucide-react';
import { reportService } from '../../services/api';
import { PageHeader, Currency, Quantity, SkeletonLoader } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const ProfitAnalytics = () => {
  const { showError } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const todayStr = getISTDate();
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [period, setPeriod] = useState('month'); // today | week | month | custom
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportService.getProfitAnalytics({
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      });
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch profit analytics');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, showError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const economics = analytics?.economics || {};
  const expenses = analytics?.expenseBreakdown || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Profit & Operating Margin"
        hindiTitle="लाभ व ग्रॉस मार्जिन विश्लेषण"
        subtitle="Business economics: Procurement costs vs distribution sales revenue vs operating expenses."
        actions={
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: period === p.id ? 'var(--color-primary)' : 'transparent',
                  color: period === p.id ? '#FFFFFF' : 'var(--color-text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Custom Date Filters if active */}
      {period === 'custom' && (
        <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>From:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', height: '36px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>To:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', height: '36px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={fetchAnalytics} className="btn btn-primary btn-sm">
            Apply Custom Filter
          </button>
        </div>
      )}

      {/* Main Profit KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Sales Revenue */}
        <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase' }}>
            1. Total Sales Revenue
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803D', marginTop: '0.25rem' }} className="font-mono-num">
            ₹{(economics.totalSalesRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: '0.2rem' }}>
            {economics.totalSalesLiters || 0} L Sold @ Avg ₹{economics.avgSalePerLiter || 0}/L
          </div>
        </div>

        {/* Purchase Cost */}
        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase' }}>
            2. Milk Purchase Cost
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '0.25rem' }} className="font-mono-num">
            ₹{(economics.totalPurchaseCost || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9333EA', marginTop: '0.2rem' }}>
            {economics.totalPurchaseLiters || 0} L Collected @ Avg ₹{economics.avgPurchasePerLiter || 0}/L
          </div>
        </div>

        {/* Gross Margin */}
        <div className="card" style={{ background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
            3. Gross Margin
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (economics.grossMargin || 0) >= 0 ? '#0F172A' : '#B91C1C', marginTop: '0.25rem' }} className="font-mono-num">
            ₹{(economics.grossMargin || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.2rem' }}>
            Spread: +₹{economics.grossMarginPerLiter || 0}/L ({economics.grossMarginPercentage || 0}%)
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="card" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase' }}>
            4. Operating Expenses
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#B91C1C', marginTop: '0.25rem' }} className="font-mono-num">
            ₹{(economics.totalExpenses || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.2rem' }}>
            LPG, Electricity, Labour & Overheads
          </div>
        </div>
      </div>

      {/* Net Operating Margin Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          padding: '1.75rem',
          border: '2px solid rgba(212, 175, 55, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ESTIMATED NET OPERATING MARGIN
            </span>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#FFFFFF', marginTop: '0.25rem' }} className="font-mono-num">
              ₹{(economics.estimatedNetMargin || 0).toLocaleString('en-IN')}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '0.4rem 0 0 0' }}>
              Net Profitability Index: {economics.netMarginPercentage || 0}% of Sales Revenue
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>
              Gross Spread: <strong>₹{economics.grossMarginPerLiter || 0} / Liter</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', maxWidth: '300px' }}>
              *Estimate is calculated based on entered milk procurement, sales route records, and logged operational expenses.
            </div>
          </div>
        </div>
      </div>

      {/* Unit Economics & Expense Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Unit Economics Breakdown */}
        <div className="card">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Unit Economics (Per Liter Breakdown)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
              <span>Average Selling Rate to Customers:</span>
              <strong style={{ color: 'var(--color-success-text)', fontSize: '1.1rem' }} className="font-mono-num">
                ₹{economics.avgSalePerLiter || 0} / L
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
              <span>Average Milk Purchase Cost:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }} className="font-mono-num">
                ₹{economics.avgPurchasePerLiter || 0} / L
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', backgroundColor: '#FFF8E7', borderRadius: 'var(--radius-md)', border: '1.5px solid #E8D49E' }}>
              <span style={{ fontWeight: 700, color: '#92400E' }}>Gross Spread / Margin:</span>
              <strong style={{ color: '#0F172A', fontSize: '1.3rem' }} className="font-mono-num">
                + ₹{economics.grossMarginPerLiter || 0} / L
              </strong>
            </div>
          </div>
        </div>

        {/* Operating Expense Distribution */}
        <div className="card">
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Operating Expense Breakdown
          </h4>

          <div className="table-responsive">
            <table className="dairy-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Entries</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((e, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{e.category}</td>
                      <td>{e.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }} className="font-mono-num">
                        ₹{e.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                      No expenses recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalytics;
