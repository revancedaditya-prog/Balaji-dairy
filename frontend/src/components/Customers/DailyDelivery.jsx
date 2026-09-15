import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Calendar,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  Save,
  RefreshCw,
  Search,
  CheckCheck,
  Phone
} from 'lucide-react';
import { deliveryService } from '../../services/api';
import { PageHeader, SearchInput } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const DailyDelivery = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const getAutoShift = () => {
    const hour = new Date().getHours();
    return hour >= 4 && hour < 14 ? 'Morning' : 'Evening';
  };

  const [date, setDate] = useState(getISTDate());
  const [shift, setShift] = useState(getAutoShift());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routeItems, setRouteItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRouteSheet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDailyRouteSheet({ date, shift });
      if (res.success && res.data) {
        setRouteItems(res.data);
      }
    } catch (err) {
      console.error(err);
      showError('Failed to load daily delivery route sheet');
    } finally {
      setLoading(false);
    }
  }, [date, shift, showError]);

  useEffect(() => {
    fetchRouteSheet();
  }, [fetchRouteSheet]);

  // "Mark All Delivered" Quick Action
  const handleMarkAllDelivered = () => {
    setRouteItems((prev) =>
      prev.map((item) => {
        const qty = Number(item.defaultQty) || 0;
        const rate = Number(item.rate) || 0;
        return {
          ...item,
          quantity: qty,
          amount: Math.round(qty * rate * 100) / 100,
          status: qty > 0 ? 'Delivered' : 'Skipped',
        };
      })
    );
    showSuccess('All customers marked Delivered with default quantities!');
  };

  // Update specific item quantity
  const handleQuantityChange = (code, newQty) => {
    const q = Math.max(0, parseFloat(newQty) || 0);
    setRouteItems((prev) =>
      prev.map((item) => {
        if (item.customerCode === code) {
          const rate = Number(item.rate) || 0;
          const amt = Math.round(q * rate * 100) / 100;
          let newStatus = item.status;
          if (q === 0) newStatus = 'Skipped';
          else if (q !== item.defaultQty) newStatus = 'Changed Qty';
          else newStatus = 'Delivered';

          return {
            ...item,
            quantity: q,
            amount: amt,
            status: newStatus,
          };
        }
        return item;
      })
    );
  };

  // Quick Adjustment Chips (+0.5L, +1L, -0.5L)
  const handleAdjustDelta = (code, delta) => {
    setRouteItems((prev) =>
      prev.map((item) => {
        if (item.customerCode === code) {
          const current = Number(item.quantity) || 0;
          const nextQty = Math.max(0, Math.round((current + delta) * 10) / 10);
          const rate = Number(item.rate) || 0;
          return {
            ...item,
            quantity: nextQty,
            amount: Math.round(nextQty * rate * 100) / 100,
            status: nextQty === 0 ? 'Skipped' : 'Changed Qty',
          };
        }
        return item;
      })
    );
  };

  // Status Change
  const handleStatusChange = (code, newStatus) => {
    setRouteItems((prev) =>
      prev.map((item) => {
        if (item.customerCode === code) {
          let qty = item.quantity;
          if (newStatus === 'Skipped') qty = 0;
          else if (newStatus === 'Delivered' && qty === 0) qty = item.defaultQty || 1;

          const rate = Number(item.rate) || 0;
          return {
            ...item,
            status: newStatus,
            quantity: qty,
            amount: Math.round(qty * rate * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  // Bulk Save Deliveries
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const res = await deliveryService.bulkRecordDeliveries({
        date,
        shift,
        deliveries: routeItems,
      });
      if (res.success) {
        showSuccess(`Saved ${res.count} route delivery records successfully!`);
        fetchRouteSheet();
      }
    } catch (err) {
      console.error(err);
      showError(err.response?.data?.message || 'Failed to save delivery sheet');
    } finally {
      setSaving(false);
    }
  };

  // Filtered route list
  const filteredRoute = routeItems.filter((i) => {
    return (
      !searchTerm ||
      String(i.customerCode).includes(searchTerm) ||
      i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.village && i.village.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Calculate live totals
  const totalDeliveredCount = routeItems.filter((i) => i.status === 'Delivered' || i.status === 'Changed Qty').length;
  const totalMilkDelivered = Math.round(
    routeItems
      .filter((i) => i.status === 'Delivered' || i.status === 'Changed Qty')
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) * 100
  ) / 100;
  const totalSalesValue = Math.round(
    routeItems
      .filter((i) => i.status === 'Delivered' || i.status === 'Changed Qty')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0) * 100
  ) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header with Shift Controls */}
      <PageHeader
        title="Daily Milk Delivery"
        hindiTitle="दैनिक दूध वितरण रूट"
        subtitle="Route distribution sheet. Mark all delivered with 1-click and adjust exceptions in seconds."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--color-surface)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <Calendar size={16} color="var(--color-text-muted)" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setShift('Morning')}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: 'none',
                  backgroundColor: shift === 'Morning' ? '#FEF3C7' : 'var(--color-surface)',
                  color: shift === 'Morning' ? '#92400E' : 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Sun size={14} /> Morning
              </button>
              <button
                type="button"
                onClick={() => setShift('Evening')}
                style={{
                  padding: '0.45rem 0.85rem',
                  border: 'none',
                  backgroundColor: shift === 'Evening' ? '#EDE9FE' : 'var(--color-surface)',
                  color: shift === 'Evening' ? '#5B21B6' : 'var(--color-text-muted)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <Moon size={14} /> Evening
              </button>
            </div>
          </div>
        }
      />

      {/* Route Action Ribbon & Live Totals */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase' }}>
              Delivered Customers
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }} className="font-mono-num">
              {totalDeliveredCount} / {routeItems.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Milk Distributed
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }} className="font-mono-num">
              {totalMilkDelivered} L
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase' }}>
              Route Revenue
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }} className="font-mono-num">
              ₹{totalSalesValue.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleMarkAllDelivered}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 700 }}
          >
            <CheckCheck size={16} />
            <span>Mark All Delivered</span>
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn btn-accent btn-sm"
            style={{ fontWeight: 800, minWidth: '130px' }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Route Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '0.85rem 1rem' }}>
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Filter route customers by name, code, or area..."
        />
      </div>

      {/* Customer Delivery Route Sheet Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="dairy-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Details</th>
                <th>Default Qty</th>
                <th>Actual Qty (L)</th>
                <th>Quick Adjust</th>
                <th>Rate (₹/L)</th>
                <th>Amount (₹)</th>
                <th>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner spinner-gold" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p>Loading route sheet...</p>
                  </td>
                </tr>
              ) : filteredRoute.length > 0 ? (
                filteredRoute.map((item) => (
                  <tr
                    key={item.customerCode}
                    style={{
                      backgroundColor:
                        item.status === 'Skipped'
                          ? '#FFFBEB'
                          : item.status === 'Returned'
                          ? '#FEF2F2'
                          : item.status === 'Changed Qty'
                          ? '#F0F9FF'
                          : 'transparent',
                    }}
                  >
                    <td>
                      <span className="badge badge-info font-mono-num">C#{item.customerCode}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{item.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {item.village || ''} {item.customerType ? `• ${item.customerType}` : ''}
                      </div>
                    </td>
                    <td className="font-mono-num" style={{ color: 'var(--color-text-muted)' }}>
                      {item.defaultQty} L
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-control font-mono-num"
                        style={{ width: '90px', fontSize: '1rem', fontWeight: 800, padding: '0.35rem 0.5rem', textAlign: 'center' }}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.customerCode, e.target.value)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => handleAdjustDelta(item.customerCode, 0.5)}
                          className="btn btn-secondary btn-icon-sm"
                          style={{ fontSize: '0.75rem', fontWeight: 700 }}
                          title="Add 0.5 Liter"
                        >
                          +0.5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustDelta(item.customerCode, 1.0)}
                          className="btn btn-secondary btn-icon-sm"
                          style={{ fontSize: '0.75rem', fontWeight: 700 }}
                          title="Add 1 Liter"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustDelta(item.customerCode, -0.5)}
                          className="btn btn-secondary btn-icon-sm"
                          style={{ fontSize: '0.75rem', fontWeight: 700 }}
                          title="Reduce 0.5 Liter"
                        >
                          -0.5
                        </button>
                      </div>
                    </td>
                    <td className="font-mono-num">₹{item.rate}</td>
                    <td style={{ fontWeight: 800, color: 'var(--color-success-text)' }} className="font-mono-num">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <select
                        className="form-control"
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.customerCode, e.target.value)}
                        style={{ height: '36px', fontSize: '0.8rem', fontWeight: 600, minWidth: '120px' }}
                      >
                        <option value="Delivered">✓ Delivered</option>
                        <option value="Changed Qty">✎ Changed Qty</option>
                        <option value="Skipped">⏸ Skipped</option>
                        <option value="Returned">↩ Returned</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No active customers configured for route delivery.
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

export default DailyDelivery;
