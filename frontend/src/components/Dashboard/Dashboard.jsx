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
  ResponsiveContainer,
  Legend
} from 'recharts';

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
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Dashboard stats...</p>
      </div>
    );
  }

  // Formatting date for simple display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="dashboard-view">
      <div className="view-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Balaji Dairy Management Live Collection Statistics</p>
        </div>
        <button className="btn btn-outline" onClick={loadData}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          Refresh
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-4">
        <div className="card kpi-card">
          <div className="kpi-icon supplier-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Suppliers</span>
            <span className="kpi-value">{stats.totalSuppliers}</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon milk-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Today's Milk</span>
            <span className="kpi-value">{stats.todayMilk} L</span>
            <span className="kpi-subtext">
              M: {stats.morningMilk}L | E: {stats.eveningMilk}L
            </span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon payment-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="18" cy="15" r="2"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Today's Payment</span>
            <span className="kpi-value">₹{stats.todayAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon month-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Monthly Collection</span>
            <span className="kpi-value">{stats.monthlyMilk} L</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid grid grid-cols-2" style={{ margin: '1.5rem 0' }}>
        <div className="card chart-card">
          <h3>Daily Milk Collection Trend (Liters)</h3>
          <div className="chart-wrapper">
            {charts.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts.dailyTrend}>
                  <defs>
                    <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e40af" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1e40af" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="milk" stroke="#1e40af" strokeWidth={2} fillOpacity={1} fill="url(#colorMilk)" name="Liters" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-placeholder">No collection data logged yet</div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Top Suppliers (Last 30 Days)</h3>
          <div className="chart-wrapper">
            {charts.topSuppliers.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.topSuppliers}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="milk" fill="#15803d" radius={[4, 4, 0, 0]} name="Liters Collected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-placeholder">No supplier data logged yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Recent Milk Entries</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Quantity</th>
                <th>Fat / SNF</th>
                <th>Rate</th>
                <th>Amount</th>
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
                      <span className={`badge badge-${entry.shift.toLowerCase()}`}>
                        {entry.shift}
                      </span>
                    </td>
                    <td>{entry.milkQuantity} L</td>
                    <td>{entry.fat}% / {entry.snf}%</td>
                    <td>₹{entry.rate}</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{entry.amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                    No milk collection records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
