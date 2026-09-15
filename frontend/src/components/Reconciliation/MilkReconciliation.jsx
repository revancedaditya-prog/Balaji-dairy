import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Save,
  Coffee,
  Truck,
  Milk,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { reconciliationService } from '../../services/api';
import { PageHeader, Currency, Quantity } from '../Common/UIComponents';
import { useToast } from '../Common/Toast';

const MilkReconciliation = () => {
  const { showSuccess, showError, showWarning } = useToast();

  const getISTDate = () => {
    const d = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offset).toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getISTDate());
  const [shift, setShift] = useState('Full Day'); // 'Morning' | 'Evening' | 'Full Day'
  const [loading, setLoading] = useState(false);
  const [reconData, setReconData] = useState(null);

  // Editable overrides
  const [openingMilk, setOpeningMilk] = useState(0);
  const [otherIncoming, setOtherIncoming] = useState(0);
  const [closingMilk, setClosingMilk] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDailyRecon = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reconciliationService.getDailyReconciliation({ date, shift });
      if (res.success && res.data) {
        setReconData(res.data);
        setOpeningMilk(res.data.openingMilk || 0);
        setOtherIncoming(res.data.otherIncoming || 0);
        setClosingMilk(res.data.closingMilk || 0);
        setNotes(res.data.notes || '');
      }
    } catch (err) {
      console.error(err);
      showError('Failed to calculate milk reconciliation');
    } finally {
      setLoading(false);
    }
  }, [date, shift, showError]);

  useEffect(() => {
    fetchDailyRecon();
  }, [fetchDailyRecon]);

  // Live dynamic calculations with user inputs
  const farmerCollection = reconData?.farmerCollection || 0;
  const customerSales = reconData?.customerSales || 0;
  const internalUse = reconData?.internalUse || 0;
  const wastage = reconData?.wastage || 0;

  const totalAvailable = Math.round((Number(openingMilk) + Number(farmerCollection) + Number(otherIncoming)) * 100) / 100;
  const totalAccounted = Math.round((Number(customerSales) + Number(internalUse) + Number(wastage) + Number(closingMilk)) * 100) / 100;
  const liveVariance = Math.round((totalAvailable - totalAccounted) * 100) / 100;

  const tolerance = reconData?.tolerance || 5;
  const isExcessVariance = Math.abs(liveVariance) > tolerance;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await reconciliationService.saveReconciliation({
        date,
        shift,
        openingMilk: Number(openingMilk) || 0,
        otherIncoming: Number(otherIncoming) || 0,
        closingMilk: Number(closingMilk) || 0,
        notes,
      });
      if (res.success) {
        showSuccess(`Saved Milk Reconciliation for ${date} (${shift})`);
        fetchDailyRecon();
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save reconciliation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Daily Milk Reconciliation"
        hindiTitle="दैनिक दूध संतुलन व हिसाब"
        subtitle="Formula: (Opening Milk + Procurement + In) - (Customer Sales + Processing + Wastage + Closing) = Balance Variance."
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
              {['Morning', 'Evening', 'Full Day'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: 'none',
                    backgroundColor: shift === s ? '#FEF3C7' : 'var(--color-surface)',
                    color: shift === s ? '#92400E' : 'var(--color-text-muted)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Variance Alert Banner */}
      {liveVariance !== 0 && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isExcessVariance ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
            border: `1.5px solid ${isExcessVariance ? 'var(--color-danger-border)' : 'var(--color-warning-border)'}`,
            color: isExcessVariance ? 'var(--color-danger-text)' : 'var(--color-warning-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                {liveVariance > 0
                  ? `SURPLUS VARIANCE: +${liveVariance} Liters Unaccounted`
                  : `SHORTAGE / DEFICIT: ${liveVariance} Liters Missing`}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                Configured tolerance is {tolerance}L. {isExcessVariance ? 'Warning: Variance exceeds tolerance!' : 'Variance is within acceptable operational limit.'}
              </div>
            </div>
          </div>

          <span className="badge" style={{ backgroundColor: '#FFFFFF', color: isExcessVariance ? '#B91C1C' : '#92400E', fontWeight: 800 }}>
            {isExcessVariance ? 'EXCESS VARIANCE' : 'ACCEPTABLE VARIANCE'}
          </span>
        </div>
      )}

      {/* Reconciliation Formula Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* INWARD (Available Milk) */}
        <div className="card" style={{ border: '2px solid #E8D49E', backgroundColor: '#FFFDF9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1.5px solid #E8D49E', paddingBottom: '0.65rem' }}>
            <Milk size={22} color="#92400E" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#92400E' }}>
              SECTION A: TOTAL MILK AVAILABLE (INWARD)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span>1. Opening Milk Stock (L)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>पिछला बचा हुआ</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control font-mono-num"
                style={{ width: '110px', textAlign: 'right', fontWeight: 700 }}
                value={openingMilk}
                onChange={(e) => setOpeningMilk(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>2. Farmer Collections (L)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>आज की दूध खरीद</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                {farmerCollection} L
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span>3. Other Inward Milk (L)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>अन्य आवक / डेयरी ट्रांसफर</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control font-mono-num"
                style={{ width: '110px', textAlign: 'right', fontWeight: 700 }}
                value={otherIncoming}
                onChange={(e) => setOtherIncoming(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8E7', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1.5px solid #E8D49E', marginTop: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#92400E' }}>TOTAL AVAILABLE MILK</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A' }} className="font-mono-num">
                {totalAvailable} L
              </span>
            </div>
          </div>
        </div>

        {/* OUTWARD (Accounted Milk) */}
        <div className="card" style={{ border: '2px solid #BAE6FD', backgroundColor: '#F9FCFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1.5px solid #BAE6FD', paddingBottom: '0.65rem' }}>
            <Truck size={22} color="#0369A1" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0369A1' }}>
              SECTION B: TOTAL MILK ACCOUNTED (OUTWARD)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>1. Customer Deliveries (L)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ग्राहकों को बिक्री</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                {customerSales} L
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>2. Internal Production (L)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>पनीर / खोया / चाय दूध</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }} className="font-mono-num">
                {internalUse} L
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>3. Wastage / Spoilage (L)</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>खराबी / फैलाव</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-danger)' }} className="font-mono-num">
                {wastage} L
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span>4. Closing Physical Stock (L)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>शाम का बचा दूध स्टॉक</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control font-mono-num"
                style={{ width: '110px', textAlign: 'right', fontWeight: 700 }}
                value={closingMilk}
                onChange={(e) => setClosingMilk(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F9FF', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1.5px solid #BAE6FD', marginTop: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#0369A1' }}>TOTAL ACCOUNTED MILK</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A' }} className="font-mono-num">
                {totalAccounted} L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Verification Card */}
      <div className="card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Reconciliation Verification Notes / Remarks</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Tanker temp checked, balance reconciled with physical stock count"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-accent btn-lg"
              style={{ fontWeight: 800, minWidth: '220px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Verify & Save Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MilkReconciliation;
