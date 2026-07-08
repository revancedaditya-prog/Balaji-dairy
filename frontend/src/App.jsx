import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import BottomNavigation from './components/Common/BottomNavigation';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MilkCollection from './components/MilkCollection/MilkCollection';
import Suppliers from './components/Suppliers/Suppliers';
import Payments from './components/Payments/Payments';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import UserManagement from './components/UserManagement/UserManagement';
import './App.css';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

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

  // Active view switcher
  const renderActiveView = () => {
    // Role-based security check for active tab
    if (user?.role === 'worker' && !['dashboard', 'collection', 'suppliers'].includes(activeTab)) {
      return <Dashboard />;
    }
    if (user?.role === 'manager' && !['dashboard', 'collection', 'suppliers', 'payments', 'reports'].includes(activeTab)) {
      return <Dashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'collection':
        return <MilkCollection />;
      case 'suppliers':
        return <Suppliers />;
      case 'payments':
        return <Payments />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings setActiveTab={setActiveTab} />; // Pass down to allow navigations to Payments/Users from Settings
      default:
        return <Dashboard />;
    }
  };

  // Convert tab ID to displayable page title
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'collection': return 'Milk Entry';
      case 'suppliers': return 'Farmers Directory';
      case 'payments': return 'Payments Ledger';
      case 'reports': return 'Reports';
      case 'users': return 'System Users';
      case 'settings': return 'App Settings';
      default: return 'Balaji Dairy';
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar navigation (Desktop-only via CSS) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-title">{getPageTitle()}</div>

          <div className="topbar-actions">
            <span className="topbar-date desktop-only">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {/* Placeholder Notification Icon */}
            <button style={{ background: 'transparent', border: 'none', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} aria-label="Notifications">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            <div className="topbar-avatar" title={user?.role?.toUpperCase()}>
              {user?.name ? user.name[0].toUpperCase() : 'B'}
            </div>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="content-container">
          {renderActiveView()}
        </main>

        {/* Bottom Navigation (Mobile-only via CSS) */}
        <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
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
