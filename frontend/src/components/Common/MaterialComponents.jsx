import React from 'react';

// MD3 Card Component
export const Card = ({ children, className = '', style = {}, onClick }) => (
  <div 
    className={`card-md3 ${className}`} 
    style={style} 
    onClick={onClick}
  >
    {children}
  </div>
);

// MD3 Button Component
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', // primary, outlined, danger, text
  type = 'button', 
  disabled = false,
  className = '', 
  style = {} 
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'outlined': return 'btn-md3-outlined';
      case 'danger': return 'btn-md3-danger';
      case 'text': return 'btn-md3-text';
      default: return 'btn-md3-primary';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-md3 ${getVariantClass()} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
};

// MD3 Outlined Text Field
export const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  name,
  inputMode, // e.g. decimal, numeric
  step,
  min,
  onBlur,
  className = '',
  style = {}
}) => (
  <div className={`input-md3-group ${className}`} style={style}>
    {label && <label className="input-md3-label">{label}</label>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      inputMode={inputMode}
      step={step}
      min={min}
      onBlur={onBlur}
      className="input-md3-control keyboard-safe-input"
    />
  </div>
);

// MD3 Badge Component
export const Badge = ({ children, type = 'neutral', className = '' }) => {
  const getBadgeClass = () => {
    switch (type) {
      case 'active':
      case 'success': 
        return 'badge-md3-success';
      case 'inactive':
      case 'error': 
        return 'badge-md3-error';
      case 'primary': 
        return 'badge-md3-primary';
      default: 
        return 'badge-md3-neutral';
    }
  };

  return (
    <span className={`badge-md3 ${getBadgeClass()} ${className}`}>
      {children}
    </span>
  );
};

// MD3 Modal / Bottom Sheet Component
export const Modal = ({ isOpen, onClose, title, children, footerActions }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close dialog">&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footerActions && (
          <div className="modal-footer">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

// MD3 Empty State Component
export const EmptyState = ({ message, description, icon, actionLabel, onActionClick }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    color: 'var(--md-sys-color-on-surface-variant)',
    backgroundColor: 'var(--md-sys-color-surface)',
    borderRadius: 'var(--md-shape-corner-large)',
    border: '1px dashed var(--md-sys-color-outline)'
  }}>
    <div style={{ marginBottom: '1rem', color: 'var(--md-sys-color-primary)', opacity: 0.8 }}>
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      )}
    </div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--md-sys-color-on-surface)' }}>{message}</h3>
    {description && <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem', maxWidth: '300px' }}>{description}</p>}
    {actionLabel && onActionClick && (
      <Button variant="outlined" onClick={onActionClick}>
        {actionLabel}
      </Button>
    )}
  </div>
);

// MD3 Skeleton Loading Component
export const Skeleton = ({ width = '100%', height = '20px', circle = false, style = {} }) => (
  <div style={{
    width,
    height,
    borderRadius: circle ? '50%' : '6px',
    backgroundColor: 'var(--md-sys-color-surface-variant)',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    ...style
  }} />
);

// MD3 Loading / Spinner Component
export const Loading = ({ label = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.75rem',
    color: 'var(--md-sys-color-on-surface-variant)'
  }}>
    <div className="spinner" style={{
      width: '36px',
      height: '36px',
      border: '3px solid var(--md-sys-color-surface-variant)',
      borderTopColor: 'var(--md-sys-color-primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    {label && <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{label}</span>}
  </div>
);
