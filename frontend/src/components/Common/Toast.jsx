import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const showError = useCallback((msg, duration) => addToast(msg, 'error', duration || 5000), [addToast]);
  const showWarning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);
  const showInfo = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning, showInfo, addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--color-success)" />}
              {toast.type === 'error' && <AlertCircle size={18} color="var(--color-danger)" />}
              {toast.type === 'warning' && <AlertTriangle size={18} color="var(--color-warning)" />}
              {toast.type === 'info' && <Info size={18} color="var(--color-info)" />}
            </div>
            <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-main)' }}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px' }}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback safe dummy functions if rendered outside provider
    return {
      showSuccess: (msg) => console.log('Success:', msg),
      showError: (msg) => console.error('Error:', msg),
      showWarning: (msg) => console.warn('Warning:', msg),
      showInfo: (msg) => console.log('Info:', msg),
    };
  }
  return context;
};

export default ToastContext;
