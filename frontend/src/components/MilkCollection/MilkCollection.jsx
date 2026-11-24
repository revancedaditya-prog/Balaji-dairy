import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { milkEntryService, paymentService, supplierService } from '../../services/api';
import './MilkCollection.css';

const getISTDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const getISTTime = () => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}).format(new Date());

const getDefaultShift = () => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(new Date()));
  return hour < 14 ? 'Morning' : 'Evening';
};

const formatNumber = (value, digits = 2) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

const formatCurrency = (value) => Number(value || 0).toLocaleString('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const dateLabel = (date) => {
  if (!date) return '—';
  const parts = date.split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const addDays = (date, days) => {
  const parts = date.split('-').map(Number);
  const value = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  return value.toISOString().slice(0, 10);
};

const emptyEntry = () => ({ fat: '', snf: '', milkQuantity: '', amount: '', remarks: '' });
const emptyPayment = () => ({ date: getISTDate(), amountPaid: '', paymentMode: 'Cash', remarks: '' });

const entryToForm = (entry) => entry ? ({
  fat: String(entry.fat ?? ''),
  snf: String(entry.snf ?? ''),
  milkQuantity: String(entry.milkQuantity ?? ''),
  amount: String(entry.amount ?? ''),
  remarks: entry.remarks || '',
}) : emptyEntry();

const MilkCollection = () => {
  const [date, setDate] = useState(getISTDate());
  const [shift, setShift] = useState(getDefaultShift());
  const [codeInput, setCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [supplier, setSupplier] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [currentEntryId, setCurrentEntryId] = useState('');
  const [entry, setEntry] = useState(emptyEntry());
  const [loadedEntry, setLoadedEntry] = useState(emptyEntry());
  const [payment, setPayment] = useState(emptyPayment());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const entryDirty = useMemo(() => {
    const numericFields = ['fat', 'snf', 'milkQuantity', 'amount'];
    const numericChanged = numericFields.some((field) =>
      Number(entry[field] || 0) !== Number(loadedEntry[field] || 0)
    );
    return numericChanged || String(entry.remarks || '') !== String(loadedEntry.remarks || '');
  }, [entry, loadedEntry]);

  const loadSupplierData = useCallback(async () => {
    if (!activeCode) return;
    setLoading(true);
    setError('');
    try {
      const [supplierResult, ledgerResult, entryResult] = await Promise.all([
        supplierService.getSupplierByCode(activeCode),
        paymentService.getSupplierLedger(activeCode),
        milkEntryService.getEntries({
          supplierCode: activeCode,
          startDate: date,
          endDate: date,
          shift,
        }),
      ]);

      const foundSupplier = supplierResult?.data;
      if (!foundSupplier) throw new Error('Supplier code ' + activeCode + ' was not found in Supabase.');

      const matches = entryResult?.data || [];
      const savedEntry = matches.length ? matches[0] : null;
      const nextEntry = entryToForm(savedEntry);

      setSupplier(foundSupplier);
      setLedger(ledgerResult);
      setCurrentEntryId(savedEntry?.id || '');
      setEntry(nextEntry);
      setLoadedEntry(nextEntry);

      if (matches.length > 1) {
        setError('More than one milk entry exists for this supplier, date and shift. Check the history before editing.');
      }
    } catch (err) {
      setSupplier(null);
      setLedger(null);
      setCurrentEntryId('');
      setEntry(emptyEntry());
      setLoadedEntry(emptyEntry());
      setError(err.message || 'Unable to load this supplier.');
    } finally {
      setLoading(false);
    }
  }, [activeCode, date, shift]);

  useEffect(() => {
    if (activeCode) loadSupplierData();
  }, [activeCode, loadSupplierData]);

  const lookupSupplier = () => {
    const code = codeInput.trim();
    if (!/^\d+$/.test(code)) {
      setError('Enter a valid numeric supplier code.');
      return;
    }
    if (!confirmDiscardEntry()) return;
    setError('');
    setMessage('');
    if (code === activeCode) {
      loadSupplierData();
    } else {
      setSupplier(null);
      setLedger(null);
      setActiveCode(code);
    }
  };

  const confirmDiscardEntry = () => {
    if (!entryDirty) return true;
    return window.confirm('Discard unsaved milk-entry changes?');
  };

  const changeDate = (nextDate) => {
    if (!nextDate || nextDate === date || !confirmDiscardEntry()) return;
    setDate(nextDate);
    setMessage('');
  };

  const changeShift = (nextShift) => {
    if (nextShift === shift || !confirmDiscardEntry()) return;
    setShift(nextShift);
    setMessage('');
  };

  const clearSupplier = () => {
    if (!confirmDiscardEntry()) return;
    setCodeInput('');
    setActiveCode('');
    setSupplier(null);
    setLedger(null);
    setCurrentEntryId('');
    setEntry(emptyEntry());
    setLoadedEntry(emptyEntry());
    setError('');
    setMessage('');
    setShowPaymentForm(false);
    setShowAllHistory(false);
  };

  const changeEntryField = (field, value) => {
    setEntry((current) => ({ ...current, [field]: value }));
    setError('');
    setMessage('');
  };

  const saveMilkEntry = async (event) => {
    event.preventDefault();
    if (!supplier || !activeCode) return;

    const quantity = Number(entry.milkQuantity);
    const amount = Number(entry.amount);
    if (entry.milkQuantity === '' || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Milk quantity is required and must be greater than zero.');
      return;
    }
    if (entry.amount === '' || !Number.isFinite(amount) || amount < 0) {
      setError('Total amount is required and cannot be negative.');
      return;
    }
    if (['fat', 'snf'].some((field) => entry[field] !== '' && (!Number.isFinite(Number(entry[field])) || Number(entry[field]) < 0))) {
      setError('FAT and SNF must be zero or more.');
      return;
    }

    setSavingEntry(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        supplierCode: Number(activeCode),
        date,
        time: getISTTime(),
        shift,
        milkQuantity: quantity,
        fat: Number(entry.fat || 0),
        snf: Number(entry.snf || 0),
        amount,
        remarks: entry.remarks || '',
      };

      if (currentEntryId) {
        await milkEntryService.updateEntry(currentEntryId, payload);
      } else {
        await milkEntryService.addEntry(payload);
      }

      await loadSupplierData();
      setMessage(currentEntryId ? 'Milk entry updated and saved in Supabase.' : 'Milk entry saved in Supabase.');
    } catch (err) {
      setError(err.message || 'Unable to save the milk entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  const refreshLedger = async () => {
    if (!activeCode) return;
    const result = await paymentService.getSupplierLedger(activeCode);
    setLedger(result);
  };

  const savePayment = async (event) => {
    event.preventDefault();
    const amountPaid = Number(payment.amountPaid);
    if (!supplier || !Number.isFinite(amountPaid) || amountPaid <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }

    setSavingPayment(true);
    setError('');
    setMessage('');
    try {
      await paymentService.recordPayment({
        supplierCode: Number(activeCode),
        date: payment.date,
        amountPaid,
        paymentMode: payment.paymentMode,
        remarks: payment.remarks,
      });
      await refreshLedger();
      setPayment(emptyPayment());
      setShowPaymentForm(false);
      setMessage('Payment recorded and added to the supplier ledger.');
    } catch (err) {
      setError(err.message || 'Unable to record this payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const weeklySummary = useMemo(() => {
    const startDate = addDays(date, -6);
    const weeklyEntries = (ledger?.history || []).filter((item) =>
      item.txnType === 'debit' && item.date >= startDate && item.date <= date
    );
    return {
      startDate,
      milk: weeklyEntries.reduce((sum, item) => sum + Number(item.milkQuantity || 0), 0),
      amount: weeklyEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [ledger, date]);

  const balance = Number(ledger?.summary?.pendingAmount || 0);
  const allHistory = ledger?.history || [];
  const paymentHistory = allHistory.filter((item) => item.txnType === 'credit');
  const historyRows = showAllHistory ? allHistory : allHistory.slice(0, 10);
  const rate = Number(entry.milkQuantity) > 0 && entry.amount !== ''
    ? Number(entry.amount) / Number(entry.milkQuantity)
    : null;

  return (
    <section className="single-entry-page">
      <div className="single-entry-heading">
        <div>
          <p className="single-entry-eyebrow">BALAJI DAIRY</p>
          <h1>Supplier Milk Entry</h1>
          <p className="single-entry-subtitle">Enter one supplier at a time using their code number.</p>
        </div>
        <div className="single-entry-date-shift">
          <label>
            <span>Entry date</span>
            <input type="date" value={date} disabled={loading || savingEntry} onChange={(event) => changeDate(event.target.value)} />
          </label>
          <div className="single-entry-shift" role="group" aria-label="Milk shift">
            <button type="button" className={shift === 'Morning' ? 'selected' : ''} disabled={loading || savingEntry} onClick={() => changeShift('Morning')}>Morning</button>
            <button type="button" className={shift === 'Evening' ? 'selected' : ''} disabled={loading || savingEntry} onClick={() => changeShift('Evening')}>Evening</button>
          </div>
        </div>
      </div>

      <div className="supplier-lookup-panel">
        <label className="supplier-code-input">
          <span>Supplier code number</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter supplier code"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                lookupSupplier();
              }
            }}
          />
        </label>
        <button type="button" className="single-entry-button primary" onClick={lookupSupplier} disabled={loading || !codeInput.trim()}>
          {loading ? 'Loading…' : 'Find Supplier'}
        </button>
        {supplier && (
          <button type="button" className="single-entry-button secondary" onClick={clearSupplier} disabled={savingEntry || savingPayment}>
            Change Supplier
          </button>
        )}
      </div>

      {error && <div className="single-entry-alert error" role="alert">{error}</div>}
      {message && <div className="single-entry-alert success" role="status">{message}</div>}

      {loading && <div className="single-entry-loading">Loading supplier details, milk records and payment history…</div>}

      {!loading && !supplier && !activeCode && (
        <div className="single-entry-empty">
          <strong>Start with a supplier code</strong>
          <span>Enter the code printed on the supplier's record to load their details and account history.</span>
        </div>
      )}

      {!loading && supplier && (
        <>
          <section className="supplier-profile-card">
            <div className="supplier-profile-title">
              <div className="supplier-avatar">#{supplier.supplierCode}</div>
              <div>
                <h2>{supplier.supplierName}</h2>
                <p>{supplier.fatherName ? 'S/o ' + supplier.fatherName : 'Supplier profile'}</p>
              </div>
              <span className={'supplier-status ' + (supplier.status === 'active' ? 'active' : 'inactive')}>{supplier.status || 'active'}</span>
            </div>
            <div className="supplier-profile-details">
              <div><span>Supplier code</span><strong>{supplier.supplierCode}</strong></div>
              <div><span>Village</span><strong>{supplier.village || '—'}</strong></div>
              <div><span>Mobile</span><strong>{supplier.mobile || '—'}</strong></div>
              <div><span>Father's name</span><strong>{supplier.fatherName || '—'}</strong></div>
            </div>
          </section>

          <section className="supplier-insights">
            <article className="supplier-insight-card">
              <span>Milk quantity · last 7 days</span>
              <strong>{formatNumber(weeklySummary.milk)} L</strong>
              <small>{dateLabel(weeklySummary.startDate)} – {dateLabel(date)}</small>
            </article>
            <article className="supplier-insight-card">
              <span>Milk amount · last 7 days</span>
              <strong>{formatCurrency(weeklySummary.amount)}</strong>
              <small>Value of milk entries, not payments made</small>
            </article>
            <article className="supplier-insight-card">
              <span>Total paid · all recorded time</span>
              <strong>{formatCurrency(ledger?.summary?.totalPaid || 0)}</strong>
              <small>{paymentHistory.length} payment transaction(s)</small>
            </article>
            <article className={'supplier-insight-card balance-card ' + (balance < 0 ? 'advance' : 'due')}>
              <span>{balance < 0 ? 'Advance with dairy' : 'Outstanding due'}</span>
              <strong>{formatCurrency(Math.abs(balance))}</strong>
              <small>Milk value minus recorded payments</small>
            </article>
          </section>

          <div className="supplier-workspace">
            <section className="supplier-panel milk-entry-panel">
              <div className="supplier-panel-heading">
                <div>
                  <h2>Milk details</h2>
                  <p>{dateLabel(date)} · {shift} shift</p>
                </div>
                <span className={'entry-record-status ' + (currentEntryId ? 'saved' : 'new')}>
                  {currentEntryId ? 'Existing entry · edit mode' : 'New entry'}
                </span>
              </div>

              <form onSubmit={saveMilkEntry}>
                <div className="milk-entry-fields">
                  <label className="single-entry-field">
                    <span>Milk quantity (L) <b>*</b></span>
                    <input type="number" min="0.01" step="0.01" inputMode="decimal" value={entry.milkQuantity} onChange={(event) => changeEntryField('milkQuantity', event.target.value)} disabled={savingEntry} required />
                  </label>
                  <label className="single-entry-field">
                    <span>Total amount (₹) <b>*</b></span>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={entry.amount} onChange={(event) => changeEntryField('amount', event.target.value)} disabled={savingEntry} required />
                  </label>
                  <label className="single-entry-field">
                    <span>FAT (%)</span>
                    <input type="number" min="0" step="0.1" inputMode="decimal" value={entry.fat} onChange={(event) => changeEntryField('fat', event.target.value)} disabled={savingEntry} />
                  </label>
                  <label className="single-entry-field">
                    <span>SNF (%)</span>
                    <input type="number" min="0" step="0.1" inputMode="decimal" value={entry.snf} onChange={(event) => changeEntryField('snf', event.target.value)} disabled={savingEntry} />
                  </label>
                  <div className="single-entry-field rate-field">
                    <span>Calculated rate</span>
                    <strong>{rate === null ? '—' : formatCurrency(rate) + ' / L'}</strong>
                    <small>Total amount ÷ milk quantity</small>
                  </div>
                  <label className="single-entry-field full-width">
                    <span>Remarks (optional)</span>
                    <input type="text" value={entry.remarks} onChange={(event) => changeEntryField('remarks', event.target.value)} disabled={savingEntry} placeholder="Any note for this milk entry" />
                  </label>
                </div>
                <div className="single-entry-actions">
                  <button type="submit" className="single-entry-button primary" disabled={savingEntry || loading}>
                    {savingEntry ? 'Saving…' : currentEntryId ? 'Update Milk Entry' : 'Save Milk Entry'}
                  </button>
                  {entryDirty && <span className="unsaved-note">Unsaved changes</span>}
                </div>
              </form>
            </section>

            <section className="supplier-panel payment-panel">
              <div className="supplier-panel-heading">
                <div>
                  <h2>Supplier payments</h2>
                  <p>Record payments and track the remaining balance.</p>
                </div>
              </div>
              {!showPaymentForm ? (
                <button type="button" className="single-entry-button secondary" onClick={() => setShowPaymentForm(true)}>
                  + Record Payment
                </button>
              ) : (
                <form onSubmit={savePayment} className="payment-form">
                  <label className="single-entry-field">
                    <span>Payment date</span>
                    <input type="date" value={payment.date} onChange={(event) => setPayment((current) => ({ ...current, date: event.target.value }))} required />
                  </label>
                  <label className="single-entry-field">
                    <span>Amount paid (₹) <b>*</b></span>
                    <input type="number" min="0.01" step="0.01" value={payment.amountPaid} onChange={(event) => setPayment((current) => ({ ...current, amountPaid: event.target.value }))} required />
                  </label>
                  <label className="single-entry-field">
                    <span>Payment mode</span>
                    <select value={payment.paymentMode} onChange={(event) => setPayment((current) => ({ ...current, paymentMode: event.target.value }))}>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </label>
                  <label className="single-entry-field">
                    <span>Remarks</span>
                    <input type="text" value={payment.remarks} onChange={(event) => setPayment((current) => ({ ...current, remarks: event.target.value }))} placeholder="Optional payment note" />
                  </label>
                  <div className="payment-form-actions">
                    <button type="submit" className="single-entry-button primary" disabled={savingPayment}>{savingPayment ? 'Saving…' : 'Save Payment'}</button>
                    <button type="button" className="single-entry-button secondary" onClick={() => setShowPaymentForm(false)} disabled={savingPayment}>Cancel</button>
                  </div>
                </form>
              )}
              <div className="payment-total-row">
                <span>Total milk value</span><strong>{formatCurrency(ledger?.summary?.totalAmount || 0)}</strong>
              </div>
              <div className="payment-total-row">
                <span>Total paid</span><strong>{formatCurrency(ledger?.summary?.totalPaid || 0)}</strong>
              </div>
              <div className="payment-total-row emphasis">
                <span>{balance < 0 ? 'Advance balance' : 'Balance due'}</span><strong>{formatCurrency(Math.abs(balance))}</strong>
              </div>
            </section>
          </div>

          <section className="supplier-panel history-panel">
            <div className="supplier-panel-heading">
              <div>
                <h2>Milk and payment history</h2>
                <p>Saved transactions for this supplier, newest first.</p>
              </div>
              {allHistory.length > 10 && (
                <button type="button" className="history-toggle" onClick={() => setShowAllHistory((value) => !value)}>
                  {showAllHistory ? 'Show recent' : 'Show all'}
                </button>
              )}
            </div>

            {historyRows.length === 0 ? (
              <div className="history-empty">No milk entries or payments have been recorded for this supplier yet.</div>
            ) : (
              <div className="history-table-wrap">
                <table className="supplier-history-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance after transaction</th></tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item, index) => (
                      <tr key={item.id || (item.date + '-' + index)}>
                        <td>{dateLabel(item.date)}</td>
                        <td><span className={'history-type ' + (item.txnType === 'credit' ? 'payment' : 'milk')}>{item.type}</span></td>
                        <td>{item.description}</td>
                        <td className={item.txnType === 'credit' ? 'credit-amount' : 'debit-amount'}>
                          {item.txnType === 'credit' ? '− ' : '+ '}{formatCurrency(item.amount)}
                        </td>
                        <td>{formatCurrency(item.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

export default MilkCollection;
