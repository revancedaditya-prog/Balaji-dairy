import React, { useState, useEffect } from 'react';
import { Search, Plus, Sun, Moon, Wifi, WifiOff, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AppHeader = ({ activeTab, onOpenQuickAction, onOpenSearch }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentShift, setCurrentShift] = useState('Morning');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Calculate current shift based on Indian time
    const hour = new Date().getHours();
    setCurrentShift(hour >= 4 && hour < 14 ? 'Morning' : 'Evening');

    // Global keyboard shortcut: Ctrl+K or Cmd+K to open Search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenSearch]);

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard': return { title: 'Dashboard', hindi: 'डैशबोर्ड व मुख्य विवरण' };
      case 'collection': return { title: 'Milk Collection', hindi: 'दूध खरीद व संकलन' };
      case 'suppliers': return { title: 'Suppliers & Farmers', hindi: 'किसान / सप्लायर डायरेक्टरी' };
      case 'supplier-ledger': return { title: 'Supplier Ledger', hindi: 'किसान खाता बही' };
      case 'supplier-payments': return { title: 'Supplier Payments', hindi: 'किसान भुगतान रजिस्टर' };
      case 'rate-chart': return { title: 'Rate Chart Grid', hindi: 'फैट / एसएनएफ दर चार्ट' };
      case 'customers': return { title: 'Customers Master', hindi: 'ग्राहक सूची' };
      case 'daily-delivery': return { title: 'Daily Milk Delivery', hindi: 'दैनिक दूध वितरण रूट' };
      case 'customer-payments': return { title: 'Customer Payments', hindi: 'ग्राहक भुगतान' };
      case 'customer-ledger': return { title: 'Customer Ledger', hindi: 'ग्राहक खाता बही' };
      case 'billing': return { title: 'Customer Billing', hindi: 'बिल व रसीद' };
      case 'reconciliation': return { title: 'Milk Reconciliation', hindi: 'दूध संतुलन व हिसाब' };
      case 'internal-use': return { title: 'Internal Milk Use', hindi: 'पनीर / खोया / चाय' };
      case 'quality-tests': return { title: 'Quality Testing', hindi: 'दूध गुणवत्ता व मिलावट जांच' };
      case 'expenses': return { title: 'Expense Management', hindi: 'डेयरी खर्चे' };
      case 'reports': return { title: 'Reports & Analytics', hindi: 'व्यापार रिपोर्ट व विश्लेषण' };
      case 'profit-analytics': return { title: 'Profit & Margins', hindi: 'लाभ व ग्रॉस मार्जिन' };
      case 'users': return { title: 'User Management', hindi: 'सिस्टम उपयोगकर्ता' };
      case 'audit-logs': return { title: 'System Audit Logs', hindi: 'ऑडिट लॉग' };
      case 'settings': return { title: 'Dairy Settings', hindi: 'डेयरी सेटिंग्स व बैकअप' };
      default: return { title: 'Balaji Dairy', hindi: 'श्री बालाजी डेयरी' };
    }
  };

  const { title, hindi } = getPageInfo();
  const dateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title-group">
          <h2>{title}</h2>
          <span className="sub desktop-only">{hindi}</span>
        </div>

        {/* Global Search Button (Desktop) */}
        <button onClick={onOpenSearch} className="topbar-search-trigger desktop-only">
          <Search size={16} />
          <span>Search farmers, customers, slips...</span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div className="topbar-actions">
        {/* Shift Badge */}
        <div className={`shift-pill ${currentShift.toLowerCase()}`}>
          {currentShift === 'Morning' ? <Sun size={14} /> : <Moon size={14} />}
          <span>{currentShift} Shift</span>
        </div>

        {/* Date Display */}
        <span className="topbar-date desktop-only">{dateFormatted}</span>

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="badge badge-danger" title="You are currently offline. Changes will sync once reconnected.">
            <WifiOff size={12} />
            <span>Offline</span>
          </div>
        )}

        {/* Global "+ ADD" Button */}
        <button
          onClick={onOpenQuickAction}
          className="btn btn-accent btn-sm"
          style={{ fontWeight: 800, padding: '0.45rem 0.95rem' }}
          title="Create new entry or transaction"
        >
          <Plus size={16} strokeWidth={3} />
          <span>+ ADD</span>
        </button>

        {/* Global Search Button (Mobile-only icon) */}
        <button
          onClick={onOpenSearch}
          className="btn-icon-sm btn-secondary mobile-only"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* User Role Avatar */}
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary)',
            color: '#D4AF37',
            border: '1.5px solid #D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'default',
          }}
          title={`${user?.name} (${user?.role?.toUpperCase()})`}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'B'}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
