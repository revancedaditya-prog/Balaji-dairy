import React, { useEffect } from 'react';
import { X, Search, AlertTriangle } from 'lucide-react';

export const PageHeader = ({ title, hindiTitle, subtitle, actions, children }) => (
  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            {title}
          </h1>
          {hindiTitle && (
            <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              • {hindiTitle}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem', fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
    {children}
  </div>
);

export const StatCard = ({ title, hindiTitle, value, unit = '', subValue, icon: Icon, variant = 'default', trend, onClick }) => {
  const getColors = () => {
    switch (variant) {
      case 'gold':
        return { bg: 'linear-gradient(135deg, #FFFDF8 0%, #FFF8E7 100%)', border: '#E8D49E', iconBg: '#FFF0C2', iconColor: '#92400E' };
      case 'success':
        return { bg: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)', border: '#BBF7D0', iconBg: '#DCFCE7', iconColor: '#15803D' };
      case 'danger':
        return { bg: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)', border: '#FECACA', iconBg: '#FEE2E2', iconColor: '#B91C1C' };
      case 'info':
        return { bg: 'linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)', border: '#BAE6FD', iconBg: '#E0F2FE', iconColor: '#0369A1' };
      case 'purple':
        return { bg: 'linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)', border: '#E9D5FF', iconBg: '#F3E8FF', iconColor: '#7E22CE' };
      default:
        return { bg: '#FFFFFF', border: 'var(--color-border)', iconBg: 'var(--color-surface-secondary)', iconColor: 'var(--color-primary)' };
    }
  };

  const colors = getColors();

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {title}
            {hindiTitle && <span style={{ opacity: 0.8, textTransform: 'none', fontWeight: 500 }}>({hindiTitle})</span>}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.35rem', lineHeight: 1.1, display: 'flex', alignItems: 'baseline', gap: '0.3rem' }} className="font-mono-num">
            {value}
            {unit && <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{unit}</span>}
          </div>
          {subValue && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 500 }}>
              {subValue}
            </div>
          )}
        </div>
        {Icon && (
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: colors.iconBg, color: colors.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: trend > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs previous period
        </div>
      )}
    </div>
  );
};

export const Currency = ({ amount = 0, bold = true, className = '' }) => {
  const num = Number(amount) || 0;
  return (
    <span className={`font-mono-num ${className}`} style={{ fontWeight: bold ? 700 : 500 }}>
      ₹{num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: num % 1 !== 0 ? 2 : 0 })}
    </span>
  );
};

export const Quantity = ({ liters = 0, unit = 'L', bold = true }) => {
  const num = Number(liters) || 0;
  return (
    <span className="font-mono-num" style={{ fontWeight: bold ? 700 : 500 }}>
      {num.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {unit}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const s = String(status || '').toLowerCase();
  if (['active', 'delivered', 'paid', 'success', 'approved', 'morning'].includes(s)) {
    return <span className="badge badge-success">{status}</span>;
  }
  if (['inactive', 'cancelled', 'rejected', 'loss', 'failed', 'returned'].includes(s)) {
    return <span className="badge badge-danger">{status}</span>;
  }
  if (['pending', 'skipped', 'warning', 'evening', 'partially paid'].includes(s)) {
    return <span className="badge badge-warning">{status}</span>;
  }
  if (['changed qty', 'custom', 'institution'].includes(s)) {
    return <span className="badge badge-info">{status}</span>;
  }
  return <span className="badge badge-neutral">{status}</span>;
};

export const SearchInput = ({ value, onChange, placeholder = 'Search...', onClear, autoFocus = false }) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-control"
      autoFocus={autoFocus}
      style={{ paddingLeft: '36px', paddingRight: value ? '34px' : '12px', height: '40px' }}
    />
    {value && (
      <button
        onClick={() => { onChange(''); if (onClear) onClear(); }}
        type="button"
        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px' }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'default' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal-content-lg' : size === 'xl' ? 'modal-content-xl' : '';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="btn-icon-sm btn-ghost" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmationDialog = ({ isOpen, onConfirm, onCancel, title = 'Confirm Action', message, confirmText = 'Confirm', isDanger = true }) => {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: isDanger ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDanger ? 'var(--color-danger)' : 'var(--color-warning)', flexShrink: 0 }}>
          <AlertTriangle size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-text-main)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export const EmptyState = ({ icon: Icon, title, message, actionText, onAction }) => (
  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
    {Icon && (
      <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        <Icon size={28} />
      </div>
    )}
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', margin: '0 0 0.35rem 0' }}>
      {title}
    </h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '380px', margin: '0 auto 1.25rem auto' }}>
      {message}
    </p>
    {actionText && onAction && (
      <button onClick={onAction} className="btn btn-primary btn-sm">
        {actionText}
      </button>
    )}
  </div>
);

export const SkeletonLoader = ({ type = 'table', count = 4 }) => {
  if (type === 'stats') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card" style={{ height: '110px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: '52px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      ))}
    </div>
  );
};
