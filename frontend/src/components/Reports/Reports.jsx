import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Filter,
  Users,
  Milk,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  MapPin,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { reportService, supplierService } from '../../services/api';
import { PageHeader, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const Reports = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const todayStr = getISTDate();
  const firstDayOfMonth = todayStr.substring(0, 7) + '-01';

  const [activeTab, setActiveTab] = useState('shift'); // 'shift' | 'supplier' | 'village' | 'monthly' | 'yearly'
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [villages, setVillages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Fetch villages for filter dropdown
  useEffect(() => {
    supplierService.getSuppliers().then((res) => {
      if (res.success) {
        const vList = [...new Set(res.data.map((s) => s.village).filter(Boolean))];
        setVillages(vList);
      }
    }).catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        shift: selectedShift || undefined,
        village: selectedVillage || undefined,
      };

      let res;
      if (activeTab === 'shift') res = await reportService.getShiftWise(params);
      else if (activeTab === 'supplier') res = await reportService.getSupplierWise(params);
      else if (activeTab === 'village') res = await reportService.getVillageWise(params);
      else if (activeTab === 'monthly') res = await reportService.getMonthly(params);
      else if (activeTab === 'yearly') res = await reportService.getYearly(params);

      if (res && res.success) {
        setReportData(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch report analytics');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, selectedShift, selectedVillage, showError]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Overall totals in current report
  const totalMilk = Math.round(reportData.reduce((sum, r) => sum + (r.totalMilk || 0), 0) * 100) / 100;
  const totalAmount = Math.round(reportData.reduce((sum, r) => sum + (r.totalAmount || 0), 0) * 100) / 100;
  const totalEntries = reportData.reduce((sum, r) => sum + (r.entryCount || 0), 0);
  const avgRate = totalMilk > 0 ? Math.round((totalAmount / totalMilk) * 100) / 100 : 0;

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      showWarning('No report data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Report_${activeTab}`);
    XLSX.writeFile(wb, `Balaji_Dairy_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported report to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Reports & Analytics Hub"
        hindiTitle="व्यापार रिपोर्ट व विश्लेषण"
        subtitle="In-depth analytics for procurement shifts, supplier volumes, village contributions, and monthly milk trends."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
              <Printer size={14} />
              <span>Print Report</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'shift', label: 'Shift-wise Collection' },
          { id: 'supplier', label: 'Farmer / Supplier-wise' },
          { id: 'village', label: 'Village-wise Procurement' },
          { id: 'monthly', label: 'Monthly Summary' },
          { id: 'yearly', label: 'Yearly Trend' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
              backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', height: '40px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', height: '40px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '140px' }}>
            <label className="form-label">Shift</label>
            <select
              className="form-control"
              style={{ height: '40px' }}
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <option value="">All Shifts</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <label className="form-label">Village</label>
            <select
              className="form-control"
              style={{ height: '40px' }}
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
            >
              <option value="">All Villages</option>
              {villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <button onClick={fetchReport} className="btn btn-primary" style={{ height: '40px' }}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: '#FFF8E7', borderColor: '#E8D49E' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#92400E' }}>Total Milk Volume</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            {totalMilk.toLocaleString('en-IN')} L
          </div>
          <div style={{ fontSize: '0.725rem', color: '#B45309' }}>{totalEntries} Total Collection Slips</div>
        </div>

        <div className="card" style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#7E22CE' }}>Total Amount Paid/Accrued</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '0.2rem' }} className="font-mono-num">
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#9333EA' }}>Avg Price: ₹{avgRate}/L</div>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                {activeTab === 'shift' && <th>Date & Shift</th>}
                {activeTab === 'supplier' && <th>Farmer Code & Name</th>}
                {activeTab === 'village' && <th>Village Name</th>}
                {activeTab === 'monthly' && <th>Month (YYYY-MM)</th>}
                {activeTab === 'yearly' && <th>Year</th>}
                <th>Total Milk (L)</th>
                <th>Weighted Avg Fat</th>
                <th>Weighted Avg SNF</th>
                <th>Total Amount (₹)</th>
                <th>Avg Rate (₹/L)</th>
                <th>Slips Count</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner spinner-gold" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p>Generating report analytics...</p>
                  </td>
                </tr>
              ) : reportData.length > 0 ? (
                reportData.map((row, idx) => {
                  const ratePerL = row.totalMilk > 0 ? Math.round((row.totalAmount / row.totalMilk) * 100) / 100 : 0;
                  return (
                    <tr key={idx}>
                      {activeTab === 'shift' && (
                        <td style={{ fontWeight: 700 }}>
                          {row.date} ({row.shift})
                        </td>
                      )}
                      {activeTab === 'supplier' && (
                        <td>
                          <span className="badge badge-gold font-mono-num" style={{ marginRight: '6px' }}>#{row.supplierCode}</span>
                          <strong>{row.supplierName}</strong>
                        </td>
                      )}
                      {activeTab === 'village' && (
                        <td style={{ fontWeight: 700 }}>{row.village || 'Unknown Village'}</td>
                      )}
                      {activeTab === 'monthly' && (
                        <td style={{ fontWeight: 700 }}>{row.month}</td>
                      )}
                      {activeTab === 'yearly' && (
                        <td style={{ fontWeight: 700 }}>{row.year}</td>
                      )}
                      <td style={{ fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                        {row.totalMilk} L
                      </td>
                      <td className="font-mono-num">{row.avgFat > 0 ? `${row.avgFat}%` : '—'}</td>
                      <td className="font-mono-num">{row.avgSnf > 0 ? `${row.avgSnf}%` : '—'}</td>
                      <td style={{ fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                        ₹{row.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className="font-mono-num">₹{ratePerL}</td>
                      <td>{row.entryCount}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No records found for the selected criteria and date range.
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

export default Reports;
