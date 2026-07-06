import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/api';
import * as XLSX from 'xlsx';

const Reports = () => {
  const [reportType, setReportType] = useState('shift-wise');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [error, setError] = useState('');

  // Filters State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterShift, setFilterShift] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterVillage, setFilterVillage] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const filters = {
        startDate,
        endDate,
        shift: filterShift,
        supplierCode: filterCode,
        village: filterVillage,
      };

      let res;
      switch (reportType) {
        case 'shift-wise':
          res = await reportService.getShiftWise(filters);
          break;
        case 'supplier-wise':
          res = await reportService.getSupplierWise(filters);
          break;
        case 'village-wise':
          res = await reportService.getVillageWise(filters);
          break;
        case 'monthly':
          res = await reportService.getMonthly(filters);
          break;
        case 'yearly':
          res = await reportService.getYearly(filters);
          break;
        default:
          res = { success: false, data: [] };
      }

      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setError('Failed to generate report statement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate, filterShift, filterCode, filterVillage]);

  // Aggregate stats from report data
  const totalMilk = reportData.reduce((sum, item) => sum + item.totalMilk, 0);
  const totalAmount = reportData.reduce((sum, item) => sum + item.totalAmount, 0);
  // Weighted Averages
  const weightedFatSum = reportData.reduce((sum, item) => sum + (item.avgFat * item.totalMilk), 0);
  const weightedSnfSum = reportData.reduce((sum, item) => sum + (item.avgSnf * item.totalMilk), 0);
  const avgFat = totalMilk > 0 ? weightedFatSum / totalMilk : 0;
  const avgSnf = totalMilk > 0 ? weightedSnfSum / totalMilk : 0;

  // Headers rendering helpers based on selected reportType
  const getHeaders = () => {
    switch (reportType) {
      case 'shift-wise':
        return ['Date', 'Shift', 'Liters Collected', 'Avg FAT (%)', 'Avg SNF (%)', 'Total Amount', 'No. Entries'];
      case 'supplier-wise':
        return ['Code', 'Supplier Name', 'Liters Collected', 'Avg FAT (%)', 'Avg SNF (%)', 'Total Amount', 'No. Entries'];
      case 'village-wise':
        return ['Village', 'Liters Collected', 'Avg FAT (%)', 'Avg SNF (%)', 'Total Amount', 'No. Entries'];
      case 'monthly':
        return ['Month (YYYY-MM)', 'Liters Collected', 'Avg FAT (%)', 'Avg SNF (%)', 'Total Amount', 'No. Entries'];
      case 'yearly':
        return ['Year', 'Liters Collected', 'Avg FAT (%)', 'Avg SNF (%)', 'Total Amount', 'No. Entries'];
      default:
        return [];
    }
  };

  const getRowCells = (item) => {
    const commonCells = [
      `${item.totalMilk.toFixed(2)} L`,
      `${item.avgFat.toFixed(2)}%`,
      `${item.avgSnf.toFixed(2)}%`,
      `₹${item.totalAmount.toFixed(2)}`,
      item.entryCount
    ];

    switch (reportType) {
      case 'shift-wise':
        return [item.date, item.shift, ...commonCells];
      case 'supplier-wise':
        return [`#${item.supplierCode}`, item.supplierName, ...commonCells];
      case 'village-wise':
        return [item.village, ...commonCells];
      case 'monthly':
        return [item.month, ...commonCells];
      case 'yearly':
        return [item.year, ...commonCells];
      default:
        return [];
    }
  };

  // Excel Export
  const exportExcel = () => {
    const headers = getHeaders();
    const rows = reportData.map((item) => {
      const row = {};
      const cells = getRowCells(item);
      headers.forEach((h, idx) => {
        row[h] = cells[idx];
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `Report_${reportType}_${startDate}_to_${endDate}.xlsx`);
  };

  // PDF Export
  const exportPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>${reportType.toUpperCase()} REPORT - Balaji Dairy</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; color: #1e40af; margin-bottom: 5px; }
            h4 { text-align: center; font-weight: normal; margin-top: 0; color: #666; }
            .kpi-section { display: flex; justify-content: space-between; margin: 20px 0; border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; font-size: 13px; }
            .kpi-item { text-align: center; flex: 1; }
            .kpi-val { font-size: 16px; font-weight: bold; color: #1e40af; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th { background-color: #f3f4f6; color: #4b5563; font-weight: bold; border: 1px solid #d1d5db; padding: 6px; text-align: left; }
            td { border: 1px solid #e5e7eb; padding: 6px; }
            tr:nth-child(even) { background-color: #f9fafb; }
          </style>
        </head>
        <body>
          <h2>BALAJI DAIRY COLLECTION STATION</h2>
          <h4>${reportType.toUpperCase()} SUMMARY STATEMENT (${startDate} to ${endDate})</h4>
          <div class="kpi-section">
            <div class="kpi-item">Total Milk Volume<div class="kpi-val">${totalMilk.toFixed(2)} L</div></div>
            <div class="kpi-item">Weighted Avg FAT<div class="kpi-val">${avgFat.toFixed(2)}%</div></div>
            <div class="kpi-item">Weighted Avg SNF<div class="kpi-val">${avgSnf.toFixed(2)}%</div></div>
            <div class="kpi-item">Total Valuation<div class="kpi-val">₹${totalAmount.toFixed(2)}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                ${getHeaders().map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  ${getRowCells(item).map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="reports-view">
      <div className="view-header">
        <div>
          <h1>Reports Generator</h1>
          <p className="text-muted">Analyze dairy collections by date range, shift, village, or individual farmer</p>
        </div>
      </div>

      {/* Select Report Mode */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'shift-wise', name: 'Daily & Shift Report' },
            { id: 'supplier-wise', name: 'Farmer-wise Statement' },
            { id: 'village-wise', name: 'Village-wise Summary' },
            { id: 'monthly', name: 'Monthly Statement' },
            { id: 'yearly', name: 'Yearly Statement' },
          ].map((item) => (
            <button
              key={item.id}
              className={`btn ${reportType === item.id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setReportType(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Filter Configuration */}
        <div style={{ gridColumn: 'span 1' }} className="grid" style={{ gap: '1rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Query Filters
            </h3>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {reportType === 'shift-wise' && (
              <div className="form-group">
                <label className="form-label">Shift</label>
                <select className="form-control" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Village Filter</label>
              <input
                type="text"
                className="form-control"
                placeholder="Type village name..."
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
              />
            </div>
            {reportType === 'supplier-wise' && (
              <div className="form-group">
                <label className="form-label">Farmer Code Filter</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Filter by farmer code..."
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value)}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={exportExcel}>Excel</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={exportPDF}>Print PDF</button>
            </div>
          </div>
        </div>

        {/* Aggregates Summary and List Grid */}
        <div style={{ gridColumn: 'span 2' }}>
          {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Aggregates Dashboard Row */}
          <div className="card grid grid-cols-4" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--accent)' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Milk</span>
              <h4 style={{ color: 'var(--primary)', fontSize: '1.25rem', marginTop: '0.25rem' }}>{totalMilk.toFixed(2)} L</h4>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Weighted FAT</span>
              <h4 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: '0.25rem' }}>{avgFat.toFixed(2)}%</h4>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Weighted SNF</span>
              <h4 style={{ color: 'var(--text-main)', fontSize: '1.25rem', marginTop: '0.25rem' }}>{avgSnf.toFixed(2)}%</h4>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Valuation</span>
              <h4 style={{ color: 'var(--secondary)', fontSize: '1.25rem', marginTop: '0.25rem' }}>₹{totalAmount.toFixed(2)}</h4>
            </div>
          </div>

          {/* Results table */}
          <div className="table-container">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <span style={{ marginTop: '0.5rem' }}>Aggregating database collection tables...</span>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    {getHeaders().map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length > 0 ? (
                    reportData.map((item, idx) => (
                      <tr key={idx}>
                        {getRowCells(item).map((cell, cIdx) => (
                          <td key={cIdx} style={cIdx === 0 ? { fontWeight: '600' } : {}}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={getHeaders().length} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                        No records logged in the system matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
