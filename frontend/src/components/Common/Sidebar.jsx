import React from 'react';
import {
  LayoutDashboard,
  Milk,
  Users,
  CreditCard,
  FileSpreadsheet,
  Truck,
  Receipt,
  Scale,
  FlaskConical,
  DollarSign,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  LogOut,
  ShoppingBag,
  BookOpen,
  Coffee
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  // Role permissions
  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager' || isOwner;
  const isWorker = user?.role === 'worker';

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: true },
      ],
    },
    {
      title: 'MILK PROCUREMENT / खरीद',
      items: [
        { id: 'collection', label: 'Milk Collection', icon: Milk, visible: true },
        { id: 'suppliers', label: 'Suppliers / Farmers', icon: Users, visible: true },
        { id: 'supplier-ledger', label: 'Supplier Ledger', icon: BookOpen, visible: isManager },
        { id: 'supplier-payments', label: 'Supplier Payments', icon: CreditCard, visible: isManager },
        { id: 'rate-chart', label: 'Rate Chart', icon: FileSpreadsheet, visible: isManager },
      ],
    },
    {
      title: 'MILK SALES / बिक्री',
      items: [
        { id: 'daily-delivery', label: 'Daily Delivery', icon: Truck, visible: true },
        { id: 'customers', label: 'Customers Master', icon: ShoppingBag, visible: true },
        { id: 'customer-payments', label: 'Customer Payments', icon: CreditCard, visible: isManager },
        { id: 'customer-ledger', label: 'Customer Ledger', icon: BookOpen, visible: isManager },
        { id: 'billing', label: 'Customer Billing', icon: Receipt, visible: isManager },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'reconciliation', label: 'Milk Reconciliation', icon: Scale, visible: isManager },
        { id: 'internal-use', label: 'Internal Milk Use', icon: Coffee, visible: true },
        { id: 'quality-tests', label: 'Quality Tests', icon: FlaskConical, visible: isManager },
        { id: 'expenses', label: 'Expenses', icon: DollarSign, visible: isManager },
      ],
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        { id: 'reports', label: 'Reports Hub', icon: BarChart3, visible: isManager },
        { id: 'profit-analytics', label: 'Profit & Margin', icon: TrendingUp, visible: isOwner },
      ],
    },
    {
      title: 'ADMIN & SYSTEM',
      items: [
        { id: 'users', label: 'Users & Roles', icon: ShieldCheck, visible: isOwner },
        { id: 'audit-logs', label: 'Audit Log', icon: History, visible: isOwner },
        { id: 'settings', label: 'Settings & Backup', icon: SettingsIcon, visible: isOwner },
      ],
    },
  ];

  return (
    <aside className="sidebar desktop-only">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Milk size={26} strokeWidth={2.5} />
        </div>
        <div className="brand-info">
          <h1>BALAJI DAIRY</h1>
          <span>Operations ERP</span>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="nav-group">
              <div className="nav-section-title">{section.title}</div>
              {visibleItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <IconComponent size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Dairy Operator'}</span>
            <span className="user-role-badge">{user?.role || 'Staff'}</span>
          </div>
        </div>

        <button onClick={logout} className="btn-sidebar-logout" title="Sign out of Balaji Dairy">
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
