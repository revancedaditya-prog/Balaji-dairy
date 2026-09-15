import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import BottomNavigation from './components/Common/BottomNavigation';
import QuickAddParty from './components/Common/QuickAddParty';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MilkCollection from './components/MilkCollection/MilkCollection';
import Suppliers from './components/Suppliers/Suppliers';
import CustomerMilk from './components/CustomerMilk/CustomerMilk';
import Payments from './components/Payments/Payments';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import UserManagement from './components/UserManagement/UserManagement';
import './App.css';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>Starting Balaji Dairy Management System...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const canAddParty = ['owner', 'manager'].includes(user?.role);

  const handleQuickSaved = (type) => {
    setQuickAddType(null);
    setQuickAddOpen(false);
    if (type === 'supplier') {
      setQuickMessage('Supplier added successfully');
      setActiveTab('suppliers');
    } else {
      setQuickMessage('Customer added successfully');
      setActiveTab('customerMilk');
    }
    window.setTimeout(() => setQuickMessage(''), 3500);
  };

  const renderActiveView = () => {
    if (user?.role === 'worker' && !['dashboard', 'collection', 'suppliers', 'customerMilk'].includes(activeTab)) {
      return <Dashboard />;
    }
    if (user?.role === 'manager' && !['dashboard', 'collection', 'suppliers', 'customerMilk', 'payments', 'reports'].includes(activeTab)) {
      return <Dashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'collection':
        return <MilkCollection />;
      case 'suppliers':
        return <Suppliers />;
      case 'customerMilk':
        return <CustomerMilk />;
      case 'payments':
        return <Payments />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings setActiveTab={setActiveTab} />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'collection': return 'Milk Entry';
      case 'suppliers': return 'Farmers Directory';
      case 'customerMilk': return 'Customer Milk Sales';
      case 'payments': return 'Payments Ledger';
      case 'reports': return 'Reports';
      case 'users': return 'System Users';
      case 'settings': return 'App Settings';
      default: return 'Balaji Dairy';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-title">{getPageTitle()}</div>

          <div className="topbar-actions">
            {canAddParty && (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setQuickAddOpen(v => !v)}
                  style={{ minHeight: 36, padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                  aria-expanded={quickAddOpen}
                  aria-label="Add supplier or customer"
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                  <span className="desktop-only">Add</span>
                </button>
                {quickAddOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 80,
                    minWidth: 220, padding: 8, borderRadius: 14, background: 'var(--md-sys-color-surface, #fff)',
                    border: '1px solid var(--md-sys-color-outline-variant, #e5e7eb)', boxShadow: '0 14px 35px rgba(15,23,42,.14)'
                  }}>
                    <button
                      type="button"
                      onClick={() => { setQuickAddType('supplier'); setQuickAddOpen(false); }}
                      style={{ width:'100%', border:0, background:'transparent', textAlign:'left', padding:'10px 12px', borderRadius:10, cursor:'pointer', fontWeight:700, color:'var(--md-sys-color-on-surface)' }}
                    >
                      + Add Supplier / Farmer
                      <div style={{ fontSize: 11, fontWeight: 500, opacity: .65, marginTop: 2 }}>दूध देने वाला सप्लायर जोड़ें</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQuickAddType('customer'); setQuickAddOpen(false); }}
                      style={{ width:'100%', border:0, background:'transparent', textAlign:'left', padding:'10px 12px', borderRadius:10, cursor:'pointer', fontWeight:700, color:'var(--md-sys-color-on-surface)' }}
                    >
                      + Add Customer
                      <div style={{ fontSize: 11, fontWeight: 500, opacity: .65, marginTop: 2 }}>दूध लेने वाला ग्राहक जोड़ें</div>
                    </button>
                  </div>
                )}
              </div>
            )}

            <span className="topbar-date desktop-only">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} aria-label="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            <div className="topbar-avatar" title={user?.role?.toUpperCase()}>
              {user?.name ? user.name[0].toUpperCase() : 'B'}
            </div>
          </div>
        </header>

        <main className="content-container">
          {quickMessage && <div className="success-alert" style={{ marginBottom: '1rem' }}>{quickMessage}</div>}
          {renderActiveView()}
        </main>

        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <QuickAddParty type={quickAddType} onClose={() => setQuickAddType(null)} onSaved={handleQuickSaved} />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
