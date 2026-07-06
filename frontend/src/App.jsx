import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import MilkCollection from './components/MilkCollection/MilkCollection';
import Suppliers from './components/Suppliers/Suppliers';
import RateChart from './components/RateChart/RateChart';
import Payments from './components/Payments/Payments';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import UserManagement from './components/UserManagement/UserManagement';
import './App.css';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      case 'rate-chart':
        return <RateChart />;
      case 'payments':
        return <Payments />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`app-layout ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        setMobileMenuOpen(false); // Close sidebar on mobile select
      }} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>

          <div className="topbar-logo">
            <h2>Balaji Dairy</h2>
          </div>

          <div className="topbar-actions">
            <span className="current-date text-muted">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="content-container">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
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
