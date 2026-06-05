import React, { useState, useEffect } from 'react';
import { rateChartService } from '../../services/api';

const RateChart = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Single cell edit state
  const [editFat, setEditFat] = useState('');
  const [editSnf, setEditSnf] = useState('');
  const [editRate, setEditRate] = useState('');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [showCsvBox, setShowCsvBox] = useState(false);

  // Constants for standard matrix view
  const fatLevels = [];
  for (let f = 3.0; f <= 10.0; f = Math.round((f + 0.1) * 10) / 10) fatLevels.push(f);

  const snfLevels = [];
  for (let s = 7.0; s <= 10.0; s = Math.round((s + 0.1) * 10) / 10) snfLevels.push(s);

  const loadRateChart = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await rateChartService.getRateChart();
      if (res.success) {
        setRates(res.data);
      }
    } catch (err) {
      setError('Failed to fetch rate chart matrix');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRateChart();
  }, []);

  // Map rates array into a direct look-up object for fast grid indexing
  const rateMap = {};
  rates.forEach((r) => {
    rateMap[`${r.fat.toFixed(1)}_${r.snf.toFixed(1)}`] = r.rate;
  });

  const handleSingleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (editFat === '' || editSnf === '' || editRate === '') {
      setError('Please provide Fat, SNF and Rate values');
      return;
    }

    try {
      const res = await rateChartService.setRate({
        fat: parseFloat(editFat),
        snf: parseFloat(editSnf),
        rate: parseFloat(editRate),
      });

      if (res.success) {
        setSuccess(`Updated Rate for Fat ${editFat}%, SNF ${editSnf}% to ₹ ${editRate}`);
        setEditRate('');
        loadRateChart();
      }
    } catch (err) {
      setError('Failed to update rate cell');
      console.error(err);
    }
  };

  const handleBulkCsv = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!csvText.trim()) {
      setError('Please input valid CSV data first');
      return;
    }

    try {
      const lines = csvText.split('\n');
      const ratesToUpload = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || i === 0 && line.toLowerCase().includes('fat')) continue; // Skip header

        const parts = line.split(',');
        if (parts.length >= 3) {
          const fatVal = parseFloat(parts[0]);
          const snfVal = parseFloat(parts[1]);
          const rateVal = parseFloat(parts[2]);

          if (!isNaN(fatVal) && !isNaN(snfVal) && !isNaN(rateVal)) {
            ratesToUpload.push({ fat: fatVal, snf: snfVal, rate: rateVal });
          }
        }
      }

      if (ratesToUpload.length === 0) {
        setError('No valid rows found in copy-pasted CSV text');
        return;
      }

      const res = await rateChartService.bulkUpload(ratesToUpload);
      if (res.success) {
        setSuccess(`Bulk imported ${ratesToUpload.length} rates successfully`);
        setCsvText('');
        setShowCsvBox(false);
        loadRateChart();
      }
    } catch (err) {
      setError('Failed to execute bulk insert operations');
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: Wiping the rate chart will stop milk entry calculations. Proceed?')) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await rateChartService.clearRateChart();
      if (res.success) {
        setSuccess('Rate chart cleared successfully');
        loadRateChart();
      }
    } catch (err) {
      setError('Failed to wipe rate chart');
      console.error(err);
    }
  };

  return (
    <div className="rate-chart-view">
      <div className="view-header">
        <div>
          <h1>Rate Chart Matrix</h1>
          <p className="text-muted">Set price per liter based on Fat and SNF milk quality parameters</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => setShowCsvBox(!showCsvBox)}>
            Bulk CSV Import
          </button>
          <button className="btn btn-danger" onClick={handleClearAll}>
            Wipe Chart
          </button>
        </div>
      </div>

      {success && <div className="success-alert">{success}</div>}
      {error && <div className="error-alert">{error}</div>}

      <div className="grid grid-cols-3" style={{ gap: '1.5rem', alignItems: 'start' }}>
        {/* Editor forms */}
        <div style={{ gridColumn: 'span 1' }} className="grid" style={{ gap: '1rem' }}>
          {/* Single cell editor */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Update Single Rate
            </h3>
            <form onSubmit={handleSingleSave}>
              <div className="form-group">
                <label className="form-label">FAT (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="e.g. 6.5"
                  value={editFat}
                  onChange={(e) => setEditFat(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">SNF (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="e.g. 9.2"
                  value={editSnf}
                  onChange={(e) => setEditSnf(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rate (₹ per Liter)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 74.50"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Apply Price
              </button>
            </form>
          </div>

          {/* Bulk Import */}
          {showCsvBox && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                Bulk CSV Import
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Copy-paste CSV values formatted as <b>fat,snf,rate</b> (no headers required).
              </p>
              <form onSubmit={handleBulkCsv}>
                <div className="form-group">
                  <textarea
                    className="form-control"
                    rows="6"
                    placeholder="6.5,9.2,74.50&#10;6.5,9.3,75.00&#10;6.6,9.2,75.20"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-block">
                  Upload CSV Rates
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Scrollable Matrix Grid */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>FAT vs SNF Price Lookup Matrix (₹)</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
              Fat values on vertical axis, SNF values on horizontal headers. Scroll sideways to view high values.
            </p>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <span style={{ marginTop: '0.5rem' }}>Building matrix lookup grid...</span>
              </div>
            ) : (
              <div className="matrix-scroll-wrapper" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <table className="matrix-table" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px', borderRight: '1px solid var(--border)', fontWeight: 'bold', backgroundColor: '#e2e8f0', textAlign: 'center', position: 'sticky', left: 0, zIndex: 1 }}>
                        FAT / SNF
                      </th>
                      {snfLevels.map((s) => (
                        <th key={s} style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'center' }}>
                          {s.toFixed(1)}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fatLevels.map((f) => (
                      <tr key={f} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid var(--border)', fontWeight: 'bold', backgroundColor: '#f1f5f9', textAlign: 'center', position: 'sticky', left: 0, zIndex: 1 }}>
                          {f.toFixed(1)}%
                        </td>
                        {snfLevels.map((s) => {
                          const lookupKey = `${f.toFixed(1)}_${s.toFixed(1)}`;
                          const rateVal = rateMap[lookupKey];
                          return (
                            <td
                              key={s}
                              onClick={() => {
                                setEditFat(f.toFixed(1));
                                setEditSnf(s.toFixed(1));
                                setEditRate(rateVal || '');
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRight: '1px solid var(--border)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: rateVal ? 'transparent' : '#fef2f2',
                                fontWeight: rateVal ? '600' : 'normal',
                                color: rateVal ? 'var(--text-main)' : 'var(--danger)'
                              }}
                              title={`Fat ${f}%, SNF ${s}%`}
                            >
                              {rateVal ? `₹${rateVal.toFixed(2)}` : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateChart;
