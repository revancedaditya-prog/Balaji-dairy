import React from 'react';
import {
  X,
  Milk,
  Truck,
  CreditCard,
  UserPlus,
  ShoppingBag,
  DollarSign,
  Coffee,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QuickActionModal = ({ isOpen, onClose, onActionSelect }) => {
  const { user } = useAuth();
  if (!isOpen) return null;

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager' || isOwner;

  const actions = [
    {
      id: 'add-milk-entry',
      title: 'Add Milk Collection',
      hindi: 'दूध खरीद एंट्री',
      icon: Milk,
      color: '#0F172A',
      bg: '#E2E8F0',
      action: () => { onActionSelect('collection', { openAdd: true }); onClose(); },
      visible: true,
    },
    {
      id: 'add-delivery',
      title: 'Customer Milk Delivery',
      hindi: 'ग्राहक दूध वितरण',
      icon: Truck,
      color: '#0284C7',
      bg: '#E0F2FE',
      action: () => { onActionSelect('daily-delivery', { openAdd: true }); onClose(); },
      visible: true,
    },
    {
      id: 'customer-payment',
      title: 'Record Customer Payment',
      hindi: 'ग्राहक पेमेंट जमा',
      icon: CreditCard,
      color: '#15803D',
      bg: '#DCFCE7',
      action: () => { onActionSelect('customer-payments', { openAdd: true }); onClose(); },
      visible: isManager,
    },
    {
      id: 'supplier-payment',
      title: 'Record Supplier Payment',
      hindi: 'किसान पेमेंट भुगतान',
      icon: CreditCard,
      color: '#92400E',
      bg: '#FEF3C7',
      action: () => { onActionSelect('supplier-payments', { openAdd: true }); onClose(); },
      visible: isManager,
    },
    {
      id: 'add-internal-use',
      title: 'Internal Milk / Paneer',
      hindi: 'पनीर / खोया / चाय दूध',
      icon: Coffee,
      color: '#7E22CE',
      bg: '#F3E8FF',
      action: () => { onActionSelect('internal-use', { openAdd: true }); onClose(); },
      visible: true,
    },
    {
      id: 'add-expense',
      title: 'Add Daily Expense',
      hindi: 'डेयरी खर्च एंट्री',
      icon: DollarSign,
      color: '#B91C1C',
      bg: '#FEE2E2',
      action: () => { onActionSelect('expenses', { openAdd: true }); onClose(); },
      visible: isManager,
    },
    {
      id: 'add-supplier',
      title: 'Add New Farmer / Supplier',
      hindi: 'नया किसान जोड़ें',
      icon: UserPlus,
      color: '#0F172A',
      bg: '#F1F5F9',
      action: () => { onActionSelect('suppliers', { openAdd: true }); onClose(); },
      visible: true,
    },
    {
      id: 'add-customer',
      title: 'Add New Customer',
      hindi: 'नया ग्राहक जोड़ें',
      icon: ShoppingBag,
      color: '#0F172A',
      bg: '#F1F5F9',
      action: () => { onActionSelect('customers', { openAdd: true }); onClose(); },
      visible: true,
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: '#D4AF37', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              <Plus size={20} strokeWidth={3} />
            </div>
            <div>
              <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.1rem' }}>Quick Actions</h3>
              <span style={{ fontSize: '0.725rem', color: '#D4AF37', fontWeight: 600 }}>तुरंत नई एंट्री करें</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', padding: '1.25rem' }}>
          {actions.filter(a => a.visible).map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={act.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = 'var(--color-surface-cream)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: act.bg, color: act.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {act.hindi}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
