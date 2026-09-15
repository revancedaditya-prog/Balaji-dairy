import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Calculator,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { rateChartService } from '../../services/api';
import { PageHeader, Modal, ConfirmationDialog } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';
import { useAuth } from '../../context/AuthContext';

const RateChart = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(false);
  const [rateGrid, setRateGrid] = useState({});
  const [fatList, setFatList] = useState([]);
  const [snfList, setSnfList] = useState([]);

  // Lookup Tool
  const [lookupFat, setLookupFat] = useState('');
  const [lookupSnf, setLookupSnf] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  // Single Rate Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFat, setEditFat] = useState('');
  const [editSnf, setEditSnf] = useState('');
  const [editRate, setEditRate] = useState('');

  // Formula Generator Modal
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [fatFactor, setFatFactor] = useState('7.2');
  const [snfFactor, setSnfFactor] = useState('3.5');
  const [basePrice, setBasePrice] = useState('0');

  // Clear Chart Confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await rateChartService.getRateChart();
      if (res.success && res.data) {
        const grid = {};
        const fats = new Set();
        const snfs = new Set();

        res.data.forEach((item) => {
          const f = Number(item.fat).toFixed(1);
          const s = Number(item.snf).toFixed(1);
          fats.add(parseFloat(f));
          snfs.add(parseFloat(s));
          if (!grid[f]) grid[f] = {};
          grid[f][s] = item.rate;
        });

        setRateGrid(grid);
        setFatList([...fats].sort((a, b) => a - b));
        setSnfList([...snfs].sort((a, b) => a - b));
      }
    } catch (err) {
      console.error(err);
      showError('Failed to fetch Rate Chart');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Handle Instant Lookup
  const handleLookup = () => {
    const f = parseFloat(lookupFat);
    const s = parseFloat(lookupSnf);
    if (!f || !s) {
      showWarning('Please enter both Fat and SNF values');
      return;
    }
    const fKey = f.toFixed(1);
    const sKey = s.toFixed(1);
    const found = rateGrid[fKey]?.[sKey];
    if (found !== undefined) {
      setLookupResult({ fat: fKey, snf: sKey, rate: found, source: 'Rate Chart Grid' });
    } else {
      // Standard fallback formula
      const calculated = Math.round((f * 7.2 + s * 3.5) * 10) / 10;
      setLookupResult({ fat: fKey, snf: sKey, rate: calculated, source: 'Calculated by Standard Formula' });
    }
  };

  // Save Single Rate
  const handleSaveSingleRate = async (e) => {
    e.preventDefault();
    const f = parseFloat(editFat);
    const s = parseFloat(editSnf);
    const r = parseFloat(editRate);

    if (!f || !s || !r) {
      showWarning('Please provide valid Fat, SNF, and Rate');
      return;
    }

    try {
      const res = await rateChartService.setRate({ fat: f, snf: s, rate: r });
      if (res.success) {
        showSuccess(`Rate for Fat ${f}% × SNF ${s}% updated to ₹${r}/L`);
        setShowEditModal(false);
        fetchRates();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save rate');
    }
  };

  // Generate Grid via Formula
  const handleGenerateFormulaGrid = async (e) => {
    e.preventDefault();
    const fFac = parseFloat(fatFactor);
    const sFac = parseFloat(snfFactor);
    const bPrice = parseFloat(basePrice) || 0;

    if (!fFac || !sFac) {
      showWarning('Please provide valid multiplier factors');
      return;
    }

    const rates = [];
    // Fat range from 3.0 to 10.0 (step 0.1)
    // SNF range from 7.5 to 10.0 (step 0.1)
    for (let f = 3.0; f <= 10.05; f += 0.1) {
      for (let s = 7.5; s <= 10.05; s += 0.1) {
        const fatVal = Math.round(f * 10) / 10;
        const snfVal = Math.round(s * 10) / 10;
        const calcRate = Math.round((fatVal * fFac + snfVal * sFac + bPrice) * 10) / 10;
        rates.push({ fat: fatVal, snf: snfVal, rate: calcRate });
      }
    }

    try {
      setLoading(true);
      const res = await rateChartService.bulkUpload(rates);
      if (res.success) {
        showSuccess(`Generated & updated ${rates.length} rate matrix cells!`);
        setShowFormulaModal(false);
        fetchRates();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate rate chart grid');
    } finally {
      setLoading(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (fatList.length === 0 || snfList.length === 0) {
      showWarning('Rate chart is empty');
      return;
    }

    // Build grid table for excel
    const rows = [];
    fatList.forEach((f) => {
      const fKey = f.toFixed(1);
      const row = { 'FAT %': fKey };
      snfList.forEach((s) => {
        const sKey = s.toFixed(1);
        row[`SNF ${sKey}%`] = rateGrid[fKey]?.[sKey] || '';
      });
      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rate_Matrix');
    XLSX.writeFile(wb, `Balaji_Rate_Chart_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Exported Rate Chart matrix to Excel');
  };

  // Import Excel
  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const ratesToUpload = [];
        data.forEach((row) => {
          const fatVal = parseFloat(row['FAT'] || row['Fat'] || row['fat'] || row['FAT %']);
          if (row['SNF'] && row['Rate']) {
            ratesToUpload.push({
              fat: fatVal,
              snf: parseFloat(row['SNF']),
              rate: parseFloat(row['Rate']),
            });
          } else {
            // Matrix row format
            Object.keys(row).forEach((col) => {
              if (col.includes('SNF') || !isNaN(parseFloat(col))) {
                const snfVal = parseFloat(col.replace(/[^0-9.]/g, ''));
                const rateVal = parseFloat(row[col]);
                if (fatVal && snfVal && rateVal) {
                  ratesToUpload.push({ fat: fatVal, snf: snfVal, rate: rateVal });
                }
              }
            });
          }
        });

        if (ratesToUpload.length > 0) {
          setLoading(true);
          const res = await rateChartService.bulkUpload(ratesToUpload);
          if (res.success) {
            showSuccess(`Successfully imported ${ratesToUpload.length} rate cells from Excel!`);
            fetchRates();
          }
        } else {
          showWarning('No valid rate chart rows detected in uploaded file');
        }
      } catch (err) {
        console.error(err);
        showError('Failed to parse Excel rate chart');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Rate Chart Management"
        hindiTitle="दूध दर चार्ट (फैट × एसएनएफ)"
        subtitle="Configure FAT × SNF milk purchase pricing grid, matrix formula, and bulk spreadsheet rates."
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>Import Excel</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} style={{ display: 'none' }} />
            </label>
            <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Export Matrix</span>
            </button>
            <button onClick={() => setShowFormulaModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Calculator size={14} />
              <span>Formula Generator</span>
            </button>
          </div>
        }
      />

      {/* Instant Rate Calculator Tool */}
      <div className="card" style={{ background: '#F8FAFC', border: '1.5px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} color="var(--color-accent)" />
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary)' }}>
              Instant Coordinate Rate Lookup
            </h4>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Instant price verification for milk collection testing
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '130px' }}>
            <label className="form-label">FAT %</label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              placeholder="e.g. 6.5"
              value={lookupFat}
              onChange={(e) => setLookupFat(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: '130px' }}>
            <label className="form-label">SNF %</label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              placeholder="e.g. 9.0"
              value={lookupSnf}
              onChange={(e) => setLookupSnf(e.target.value)}
            />
          </div>

          <button onClick={handleLookup} className="btn btn-primary" style={{ minWidth: '120px' }}>
            <Search size={16} />
            <span>Lookup Rate</span>
          </button>

          {lookupResult && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem 1.25rem',
                backgroundColor: 'var(--color-success-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-success-text)', fontWeight: 600 }}>
                  FAT {lookupResult.fat}% × SNF {lookupResult.snf}%
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                  ₹{lookupResult.rate} <span style={{ fontSize: '0.8rem' }}>/ Liter</span>
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{lookupResult.source}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive FAT x SNF Matrix Grid */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              FAT × SNF Pricing Matrix Grid
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Click any cell to edit or fine-tune pricing
            </span>
          </div>
          <button
            onClick={() => {
              setEditFat('6.5');
              setEditSnf('9.0');
              setEditRate('');
              setShowEditModal(true);
            }}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} />
            <span>Set Custom Rate</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner spinner-gold" style={{ margin: '0 auto 1rem auto' }} />
            <p>Loading Rate Grid Matrix...</p>
          </div>
        ) : fatList.length > 0 ? (
          <div className="table-responsive" style={{ maxHeight: '60vh' }}>
            <table className="dairy-table" style={{ textAlign: 'center' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--color-primary)', color: '#FFFFFF' }}>
                    FAT \ SNF
                  </th>
                  {snfList.map((snf) => (
                    <th key={snf} className="font-mono-num" style={{ minWidth: '60px' }}>
                      {snf.toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatList.map((fat) => {
                  const fKey = fat.toFixed(1);
                  return (
                    <tr key={fat}>
                      <td style={{ position: 'sticky', left: 0, zIndex: 5, background: 'var(--color-surface-secondary)', fontWeight: 800 }} className="font-mono-num">
                        {fKey}%
                      </td>
                      {snfList.map((snf) => {
                        const sKey = snf.toFixed(1);
                        const rateVal = rateGrid[fKey]?.[sKey];
                        return (
                          <td
                            key={snf}
                            className="font-mono-num"
                            style={{
                              cursor: 'pointer',
                              fontWeight: 600,
                              backgroundColor: rateVal ? 'transparent' : '#F1F5F9',
                              color: rateVal ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                            }}
                            onClick={() => {
                              setEditFat(fKey);
                              setEditSnf(sKey);
                              setEditRate(rateVal || '');
                              setShowEditModal(true);
                            }}
                            title={`Edit Fat ${fKey} x SNF ${sKey}`}
                          >
                            {rateVal !== undefined ? `₹${rateVal}` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <FileSpreadsheet size={44} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>Rate Chart is currently unseeded</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Generate rates using standard formula (Fat × 7.2 + SNF × 3.5) or import your Excel rate sheet.
            </p>
            <button onClick={() => setShowFormulaModal(true)} className="btn btn-accent btn-sm" style={{ fontWeight: 800 }}>
              <Calculator size={16} />
              <span>Generate Standard Rate Chart</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Single Rate Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Set Matrix Rate Cell"
      >
        <form onSubmit={handleSaveSingleRate}>
          <div className="form-group">
            <label className="form-label">FAT %</label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              value={editFat}
              onChange={(e) => setEditFat(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">SNF %</label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              value={editSnf}
              onChange={(e) => setEditSnf(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rate (₹/L) <span className="required">*</span></label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              style={{ fontSize: '1.2rem', fontWeight: 800 }}
              placeholder="e.g. 78.5"
              value={editRate}
              onChange={(e) => setEditRate(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Rate
            </button>
          </div>
        </form>
      </Modal>

      {/* Formula Matrix Generator Modal */}
      <Modal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        title="Formula-Based Rate Grid Generator"
      >
        <form onSubmit={handleGenerateFormulaGrid}>
          <div style={{ backgroundColor: 'var(--color-surface-cream)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent-border)', marginBottom: '1.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Formula: Rate = (FAT × Fat Factor) + (SNF × SNF Factor) + Base Price
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Fat Factor Multiplier (e.g. 7.2)</label>
            <input
              type="number"
              step="0.01"
              className="form-control font-mono-num"
              value={fatFactor}
              onChange={(e) => setFatFactor(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">SNF Factor Multiplier (e.g. 3.5)</label>
            <input
              type="number"
              step="0.01"
              className="form-control font-mono-num"
              value={snfFactor}
              onChange={(e) => setSnfFactor(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Base Adjustment (₹)</label>
            <input
              type="number"
              step="0.1"
              className="form-control font-mono-num"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={() => setShowFormulaModal(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" style={{ fontWeight: 800 }}>
              Generate Full Matrix (~1,800 cells)
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RateChart;
