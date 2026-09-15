import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, ShoppingBag, Milk, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { supplierService, customerService, milkEntryService, deliveryService } from '../../services/api';

const GlobalSearchModal = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    suppliers: [],
    customers: [],
    milkEntries: [],
    deliveries: [],
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ suppliers: [], customers: [], milkEntries: [], deliveries: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults({ suppliers: [], customers: [], milkEntries: [], deliveries: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.trim();
        // Fetch suppliers matching code or name
        const [supRes, custRes, milkRes, delRes] = await Promise.allSettled([
          supplierService.getSuppliers({ search: q }).catch(() => ({ data: [] })),
          customerService.getCustomers({ search: q }).catch(() => ({ data: [] })),
          milkEntryService.getEntries({ search: q, limit: 5 }).catch(() => ({ data: [] })),
          deliveryService.getDeliveries({ search: q, limit: 5 }).catch(() => ({ data: [] })),
        ]);

        setResults({
          suppliers: (supRes.status === 'fulfilled' && supRes.value?.data) ? supRes.value.data.slice(0, 4) : [],
          customers: (custRes.status === 'fulfilled' && custRes.value?.data) ? custRes.value.data.slice(0, 4) : [],
          milkEntries: (milkRes.status === 'fulfilled' && milkRes.value?.data) ? milkRes.value.data.slice(0, 3) : [],
          deliveries: (delRes.status === 'fulfilled' && delRes.value?.data) ? delRes.value.data.slice(0, 3) : [],
        });
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.suppliers.length +
    results.customers.length +
    results.milkEntries.length +
    results.deliveries.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
        {/* Search Bar Input */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-surface)' }}>
          <Search size={22} color="var(--color-text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type code, name, phone or village (e.g. 101, Ramesh, 98765)..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.05rem', fontWeight: 500, color: 'var(--color-text-main)', background: 'transparent' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          )}
          <button onClick={onClose} className="btn-icon-sm btn-ghost" aria-label="Close search">
            <kbd style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)' }}>ESC</kbd>
          </button>
        </div>

        {/* Results Area */}
        <div className="modal-body" style={{ padding: '1rem 1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
              <div className="spinner spinner-gold" />
              <span>Searching Balaji Dairy database...</span>
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
              <Search size={36} strokeWidth={1.5} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>No matching records found for "{query}"</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try searching by supplier code, customer name, mobile number, or village.</p>
            </div>
          )}

          {!loading && !query && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Quick Entity Search</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Find any Farmer, Customer, Collection Slip, or Delivery instantly.</p>
            </div>
          )}

          {/* Suppliers Results */}
          {results.suppliers.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={14} /> Farmers / Suppliers ({results.suppliers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {results.suppliers.map((sup) => (
                  <div
                    key={sup._id || sup.supplierCode}
                    onClick={() => { onNavigate('suppliers', { search: sup.supplierCode }); onClose(); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-cream)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'var(--transition-fast)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span className="badge badge-gold">#{sup.supplierCode}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{sup.supplierName}</span>
                      {sup.village && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>• {sup.village}</span>}
                      {sup.mobile && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>• {sup.mobile}</span>}
                    </div>
                    <ArrowRight size={16} color="var(--color-text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Results */}
          {results.customers.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShoppingBag size={14} /> Customers ({results.customers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {results.customers.map((cust) => (
                  <div
                    key={cust._id || cust.customerCode}
                    onClick={() => { onNavigate('customers', { search: cust.customerCode }); onClose(); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span className="badge badge-info">C#{cust.customerCode}</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{cust.customerName}</span>
                      {cust.customerType && <span className="badge badge-neutral">{cust.customerType}</span>}
                      {cust.mobile && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>• {cust.mobile}</span>}
                    </div>
                    <ArrowRight size={16} color="var(--color-text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
