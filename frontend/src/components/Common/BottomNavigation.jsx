import React, { useState } from 'react';
import {
  LayoutDashboard,
  Milk,
  Truck,
  BookOpen,
  Menu,
  X,
  Users,
  ShoppingBag,
  CreditCard,
  Receipt,
  Scale,
  DollarSign,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  Coffee,
  LogOut,
  FlaskConical,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BottomNavigation = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager' || isOwner;

  const handleSelect = (tab) => {
    setActiveTab(tab);
    setShowMoreDrawer(false);
  };

  const moreMenuItems = [
    { id: 'suppliers', label: 'Farmers / Suppliers', icon: Users, visible: true },
    { id: 'customers', label: 'Customers Master', icon: ShoppingBag, visible: true },
    { id: 'rate-chart', label: 'Rate Chart Grid', icon: FileSpreadsheet, visible: isManager },
    { id: 'supplier-ledger', label: 'Supplier Ledger', icon: BookOpen, visible: isManager },
    { id: 'customer-payments', label: 'Customer Payments', icon: CreditCard, visible: isManager },
    { id: 'supplier-payments', label: 'Supplier Payments', icon: CreditCard, visible: isManager },
    { id: 'billing', label: 'Customer Billing', icon: Receipt, visible: isManager },
    { id: 'reconciliation', label: 'Milk Reconciliation', icon: Scale, visible: isManager },
    { id: 'internal-use', label: 'Internal Milk Use', icon: Coffee, visible: true },
    { id: 'quality-tests', label: 'Quality Tests', icon: FlaskConical, visible: isManager },
    { id: 'expenses', label: 'Expense Management', icon: DollarSign, visible: isManager },
    { id: 'reports', label: 'Reports Hub', icon: BarChart3, visible: isManager },
    { id: 'profit-analytics', label: 'Profit & Margin', icon: TrendingUp, visible: isOwner },
    { id: 'users', label: 'Users & Roles', icon: ShieldCheck, visible: isOwner },
    { id: 'audit-logs', label: 'Audit Logs', icon: History, visible: isOwner },
    { id: 'settings', label: 'Settings & Backup', icon: SettingsIcon, visible: isOwner },
  ];

  return (
    <>
      {/* 5-Item Bottom Bar */}
      <nav className="bottom-nav mobile-only">
        <button
          onClick={() => handleSelect('dashboard')}
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() => handleSelect('collection')}
          className={`bottom-nav-item ${activeTab === 'collection' ? 'active' : ''}`}
        >
          <Milk size={20} />
          <span>Collection</span>
        </button>

        <button
          onClick={() => handleSelect('daily-delivery')}
          className={`bottom-nav-item ${activeTab === 'daily-delivery' ? 'active' : ''}`}
        >
          <Truck size={20} />
          <span>Sales</span>
        </button>

        <button
          onClick={() => handleSelect('customer-ledger')}
          className={`bottom-nav-item ${['customer-ledger', 'supplier-ledger'].includes(activeTab) ? 'active' : ''}`}
        >
          <BookOpen size={20} />
          <span>Ledger</span>
        </button>

        <button
          onClick={() => setShowMoreDrawer(true)}
          className={`bottom-nav-item ${showMoreDrawer ? 'active' : ''}`}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* More Navigation Drawer / Bottom Sheet */}
      {showMoreDrawer && (
        <div className="modal-overlay mobile-only" onClick={() => setShowMoreDrawer(false)}>
          <div
            className="modal-content"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '80vh', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>All Dairy Modules</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Logged in as {user?.name} ({user?.role?.toUpperCase()})
                </span>
              </div>
              <button onClick={() => setShowMoreDrawer(false)} className="btn-icon-sm btn-ghost">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {moreMenuItems
                .filter((item) => item.visible)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.75rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        backgroundColor: isActive ? 'var(--color-accent-light)' : 'var(--color-surface)',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.825rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isActive ? '#FFEBAA' : 'var(--color-surface-secondary)',
                          color: isActive ? '#92400E' : 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => {
                  setShowMoreDrawer(false);
                  logout();
                }}
                className="btn btn-danger btn-sm"
                style={{ width: '100%' }}
              >
                <LogOut size={16} />
                <span>Sign Out ({user?.phone || user?.email})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNavigation;
