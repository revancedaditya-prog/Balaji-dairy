import React, { useState, useEffect } from 'react';
import { rateChartService } from '../../services/api';

const RateChart = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search and Pagination State
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Single cell edit state
  const [editFat, setEditFat] = useState('');
  const [editSnf, setEditSnf] = useState('');
  const [editRate, setEditRate] = useState('');

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [showCsvBox, setShowCsvBox] = useState(false);

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

  const handleDeleteRate = async (id, fatVal, snfVal) => {
    if (!window.confirm(`Are you sure you want to delete the rate for Fat ${fatVal}%, SNF ${snfVal}%?`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await rateChartService.deleteRate(id);
      if (res.success) {
        setSuccess(`Deleted rate for Fat ${fatVal}%, SNF ${snfVal}%`);
        loadRateChart();
      }
    } catch (err) {
      setError('Failed to delete rate entry');
      console.error(err);
    }
  };

  // Search Filter & Pagination Logic
  const filteredRates = rates.filter((r) => {
    const fatStr = r.fat.toFixed(1);
    const snfStr = r.snf.toFixed(1);
    const rateStr = r.rate.toFixed(2);
    const s = search.toLowerCase();
    return fatStr.includes(s) || snfStr.includes(s) || rateStr.includes(s);
  });

  const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRates = filteredRates.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="rate-chart-view">
      <div className="view-header">
        <div>
          <h1>Rate Chart Settings</h1>
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
              Set Price Rate
            </h3>
            <form onSubmit={handleSingleSave}>
              <div className="form-group">
                <label className="form-label">FAT (%)*</label>
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
                <label className="form-label">SNF (%)*</label>
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
                <label className="form-label">Rate (₹ per Liter)*</label>
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

        {/* Scrollable Rate List Grid */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>FAT & SNF Rate Index</h3>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Index of configured pricing rates per liter
                </p>
              </div>
              <div style={{ width: '220px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search rates..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on search
                  }}
                  style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
                <span style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fetching rate database...</span>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>FAT (%)</th>
                        <th>SNF (%)</th>
                        <th>Rate (₹/Liter)</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRates.length > 0 ? (
                        currentRates.map((r) => (
                          <tr key={r._id}>
                            <td style={{ fontWeight: '600' }}>{r.fat.toFixed(1)}%</td>
                            <td style={{ fontWeight: '600' }}>{r.snf.toFixed(1)}%</td>
                            <td style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{r.rate.toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', marginRight: '0.35rem' }}
                                onClick={() => {
                                  setEditFat(r.fat.toFixed(1));
                                  setEditSnf(r.snf.toFixed(1));
                                  setEditRate(r.rate.toFixed(2));
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleDeleteRate(r._id, r.fat, r.snf)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>
                            No rate entries found in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredRates.length)} of {filteredRates.length} entries
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.8rem', fontWeight: '500' }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateChart;
