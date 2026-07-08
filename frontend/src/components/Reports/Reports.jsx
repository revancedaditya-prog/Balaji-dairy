import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/api';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Loading, EmptyState } from '../Common/MaterialComponents';

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

  // Collapsible Filters Panel on Mobile
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
  const weightedFatSum = reportData.reduce((sum, item) => sum + (item.avgFat * item.totalMilk), 0);
  const weightedSnfSum = reportData.reduce((sum, item) => sum + (item.avgSnf * item.totalMilk), 0);
  const avgFat = totalMilk > 0 ? weightedFatSum / totalMilk : 0;
  const avgSnf = totalMilk > 0 ? weightedSnfSum / totalMilk : 0;

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

  const getMobileCardLabel = (item) => {
    switch (reportType) {
      case 'shift-wise':
        return `${item.date} • ${item.shift}`;
      case 'supplier-wise':
        return `#${item.supplierCode} - ${item.supplierName}`;
      case 'village-wise':
        return `Village: ${item.village}`;
      case 'monthly':
        return `Month: ${item.month}`;
      case 'yearly':
        return `Year: ${item.year}`;
      default:
        return 'Summary Record';
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
    <div className="reports-view" style={{ animation: 'fadeIn 250ms ease-in-out' }}>
      {/* Select Report Mode Buttons */}
      <Card style={{ padding: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {[
            { id: 'shift-wise', name: 'Shift-wise' },
            { id: 'supplier-wise', name: 'Farmer-wise' },
            { id: 'village-wise', name: 'Village-wise' },
            { id: 'monthly', name: 'Monthly' },
            { id: 'yearly', name: 'Yearly' },
          ].map((item) => (
            <Button
              key={item.id}
              variant={reportType === item.id ? 'primary' : 'outlined'}
              onClick={() => setReportType(item.id)}
              style={{ minHeight: '38px', padding: '0.5rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3" style={{ gap: '1rem', alignItems: 'start' }}>
        {/* Expandable Query Filters Panel */}
        <div style={{ gridColumn: 'span 1' }}>
          
          {/* Mobile Collapsible Header */}
          <Card 
            className="mobile-only" 
            style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Configure Search Filters</span>
            <span>{filtersExpanded ? '▲' : '▼'}</span>
          </Card>

          {/* Actual Filters Box */}
          <div className={`${!filtersExpanded ? 'desktop-only' : ''}`}>
            <Card style={{ padding: '1.25rem' }}>
              <h3 className="desktop-only" style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid var(--md-sys-color-surface-variant)', paddingBottom: '0.5rem' }}>
                Query Filters
              </h3>
              
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              {reportType === 'shift-wise' && (
                <div className="form-group">
                  <label className="input-md3-label">Shift</label>
                  <select className="input-md3-control" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
                    <option value="">All Shifts</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              )}

              <Input
                label="Village Filter"
                type="text"
                placeholder="Village name..."
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
              />

              {reportType === 'supplier-wise' && (
                <Input
                  label="Farmer Code Filter"
                  type="number"
                  placeholder="Farmer code..."
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value)}
                />
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Button variant="outlined" style={{ flex: 1, minHeight: '40px' }} onClick={exportExcel}>Excel</Button>
                <Button variant="outlined" style={{ flex: 1, minHeight: '40px' }} onClick={exportPDF}>Print PDF</Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Aggregates Summary and List Grid */}
        <div style={{ gridColumn: 'span 2' }}>
          {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

          {/* Aggregates Dashboard Row */}
          <div className="grid grid-cols-4" style={{ marginBottom: '1rem' }}>
            <Card style={{ padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Total Volume</span>
              <h4 style={{ color: 'var(--md-sys-color-primary)', fontSize: '1.15rem', marginTop: '0.25rem' }}>{totalMilk.toFixed(2)} L</h4>
            </Card>
            <Card style={{ padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Weighted FAT</span>
              <h4 style={{ color: 'var(--md-sys-color-on-surface)', fontSize: '1.15rem', marginTop: '0.25rem' }}>{avgFat.toFixed(2)}%</h4>
            </Card>
            <Card style={{ padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Weighted SNF</span>
              <h4 style={{ color: 'var(--md-sys-color-on-surface)', fontSize: '1.15rem', marginTop: '0.25rem' }}>{avgSnf.toFixed(2)}%</h4>
            </Card>
            <Card style={{ padding: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: '500' }}>Valuation</span>
              <h4 style={{ color: 'var(--md-sys-color-success)', fontSize: '1.15rem', marginTop: '0.25rem' }}>₹{totalAmount.toFixed(2)}</h4>
            </Card>
          </div>

          {/* Desktop Results Table */}
          <Card style={{ padding: '1rem' }} className="desktop-only">
            <div className="table-container">
              {loading ? (
                <Loading label="Aggregating records..." />
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
                        <td colSpan={getHeaders().length} style={{ textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)', padding: '2rem' }}>
                          No records logged in the system matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Mobile Results Cards */}
          <div className="mobile-card-list mobile-only">
            {loading ? (
              <Loading label="Aggregating records..." />
            ) : reportData.length > 0 ? (
              reportData.map((item, idx) => (
                <div key={idx} className="mobile-row-card">
                  <div className="mobile-row-card-header">
                    <div className="mobile-row-card-title">{getMobileCardLabel(item)}</div>
                    <Badge type="primary">{item.entryCount} Entries</Badge>
                  </div>
                  <div className="mobile-row-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Milk Collected:</span>
                      <span style={{ fontWeight: '600' }}>{item.totalMilk.toFixed(2)} L</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Avg FAT / Avg SNF:</span>
                      <span>{item.avgFat.toFixed(2)}% / {item.avgSnf.toFixed(2)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', borderTop: '1px dashed var(--md-sys-color-surface-variant)', paddingTop: '0.25rem' }}>
                      <span style={{ fontWeight: '600' }}>Total Amount:</span>
                      <span style={{ fontWeight: '700', color: 'var(--md-sys-color-success)' }}>₹{item.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No collection logs match filter query" />
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Reports;
