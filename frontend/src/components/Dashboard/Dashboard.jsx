import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, Badge, Loading, EmptyState } from '../Common/MaterialComponents';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    todayMilk: 0,
    todayAmount: 0,
    morningMilk: 0,
    eveningMilk: 0,
    monthlyMilk: 0,
    recentEntries: []
  });
  const [charts, setCharts] = useState({
    dailyTrend: [],
    monthlyTrend: [],
    topSuppliers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const statsRes = await reportService.getDashboardStats();
      const chartsRes = await reportService.getChartsData();

      if (statsRes.success) setStats(statsRes.data);
      if (chartsRes.success) setCharts(chartsRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <Loading label="Loading Dashboard stats..." />;
  }

  // Formatting date for simple display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="dashboard-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        {/* Total Suppliers */}
        <Card className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon supplier-icon" style={{
            backgroundColor: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
            width: '48px', height: '48px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifycontent: 'center'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Active Farmers</span>
            <h2 className="kpi-value" style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '2px' }}>{stats.totalSuppliers}</h2>
          </div>
        </Card>

        {/* Today's Milk Volume */}
        <Card className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon milk-icon" style={{
            backgroundColor: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
            width: '48px', height: '48px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifycontent: 'center'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Today's Milk</span>
            <h2 className="kpi-value" style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '2px' }}>{stats.todayMilk} L</h2>
            <span className="kpi-subtext" style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
              M: {stats.morningMilk}L • E: {stats.eveningMilk}L
            </span>
          </div>
        </Card>

        {/* Today's Valuation */}
        <Card className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon payment-icon" style={{
            backgroundColor: 'var(--md-sys-color-success-container)',
            color: 'var(--md-sys-color-on-success-container)',
            width: '48px', height: '48px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifycontent: 'center'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="18" cy="15" r="2"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Today's Amount</span>
            <h2 className="kpi-value" style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '2px', color: 'var(--md-sys-color-success)' }}>₹{stats.todayAmount.toLocaleString('en-IN')}</h2>
          </div>
        </Card>

        {/* Monthly Collection */}
        <Card className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="kpi-icon month-icon" style={{
            backgroundColor: '#fae8ff',
            color: '#86198f',
            width: '48px', height: '48px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifycontent: 'center'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: 'auto' }}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Monthly Collection</span>
            <h2 className="kpi-value" style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '2px' }}>{stats.monthlyMilk} L</h2>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
        {/* Daily Trend Line Chart */}
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--md-sys-color-on-surface)' }}>Daily Milk Collection Trend (Liters)</h3>
          <div style={{ width: '100%', height: '240px' }}>
            {charts.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--md-sys-color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--md-sys-color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-surface-variant)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="var(--md-sys-color-on-surface-variant)" fontSize={11} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', borderColor: 'var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="milk" stroke="var(--md-sys-color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorMilk)" name="Liters" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifycontent: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem' }}>No collection data logged yet</div>
            )}
          </div>
        </Card>

        {/* Top Suppliers Bar Chart */}
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--md-sys-color-on-surface)' }}>Top Suppliers (Last 30 Days)</h3>
          <div style={{ width: '100%', height: '240px' }}>
            {charts.topSuppliers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topSuppliers} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--md-sys-color-surface-variant)" />
                  <XAxis dataKey="name" stroke="var(--md-sys-color-on-surface-variant)" fontSize={11} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--md-sys-color-surface)', borderColor: 'var(--md-sys-color-outline)', borderRadius: '8px' }} />
                  <Bar dataKey="milk" fill="var(--md-sys-color-success)" radius={[4, 4, 0, 0]} name="Liters Collected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifycontent: 'center', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem' }}>No supplier data logged yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--md-sys-color-on-surface)' }}>Recent Milk Entries</h3>
        
        {/* Desktop view table */}
        <div className="table-container desktop-only">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Quantity</th>
                <th>Fat / SNF</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEntries.length > 0 ? (
                stats.recentEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td style={{ fontWeight: '600' }}>#{entry.supplierCode}</td>
                    <td>{entry.supplierName}</td>
                    <td>{entry.date}</td>
                    <td>
                      <Badge type={entry.shift === 'Morning' ? 'primary' : 'success'}>
                        {entry.shift}
                      </Badge>
                    </td>
                    <td>{entry.milkQuantity} L</td>
                    <td>{entry.fat}% / {entry.snf}%</td>
                    <td style={{ fontWeight: '600', color: 'var(--md-sys-color-primary)', textAlign: 'right' }}>₹{entry.amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                    No milk collection records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list (Android-first responsive layout) */}
        <div className="mobile-card-list mobile-only">
          {stats.recentEntries.length > 0 ? (
            stats.recentEntries.map((entry) => (
              <div key={entry._id} className="mobile-row-card">
                <div className="mobile-row-card-header">
                  <div className="mobile-row-card-title">#{entry.supplierCode} - {entry.supplierName}</div>
                  <Badge type={entry.shift === 'Morning' ? 'primary' : 'success'}>
                    {entry.shift}
                  </Badge>
                </div>
                <div className="mobile-row-card-body" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>{entry.date}</div>
                    <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.75rem' }}>
                      Fat/SNF: {entry.fat}% / {entry.snf}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: 'var(--md-sys-color-on-surface)' }}>{entry.milkQuantity} Liters</div>
                    <div style={{ fontWeight: '700', color: 'var(--md-sys-color-primary)', fontSize: '1rem' }}>₹{entry.amount}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="No milk collection records found" />
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
