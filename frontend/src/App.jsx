import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Common/Toast';
import Sidebar from './components/Common/Sidebar';
import AppHeader from './components/Common/AppHeader';
import BottomNavigation from './components/Common/BottomNavigation';
import QuickActionModal from './components/Common/QuickActionModal';
import GlobalSearchModal from './components/Common/GlobalSearchModal';

// Auth
import Login from './components/Auth/Login';

// Procurement & Farmers
import MilkCollection from './components/MilkCollection/MilkCollection';
import Suppliers from './components/Suppliers/Suppliers';
import SupplierLedger from './components/Suppliers/SupplierLedger';
import SupplierPayments from './components/Suppliers/SupplierPayments';
import RateChart from './components/RateChart/RateChart';

// Sales & Customers
import DailyDelivery from './components/Customers/DailyDelivery';
import Customers from './components/Customers/Customers';
import CustomerPayments from './components/Customers/CustomerPayments';
import CustomerLedger from './components/Customers/CustomerLedger';
import CustomerBilling from './components/Billing/CustomerBilling';

// Operations
import Dashboard from './components/Dashboard/Dashboard';
import MilkReconciliation from './components/Reconciliation/MilkReconciliation';
import InternalMilkUse from './components/InternalUse/InternalMilkUse';
import QualityTests from './components/Quality/QualityTests';
import Expenses from './components/Expenses/Expenses';

// Reports & Business
import Reports from './components/Reports/Reports';
import ProfitAnalytics from './components/Profit/ProfitAnalytics';

// Admin & Settings
import UserManagement from './components/UserManagement/UserManagement';
import AuditLogs from './components/Audit/AuditLogs';
import Settings from './components/Settings/Settings';

import './index.css';
import './App.css';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabParams, setTabParams] = useState({});

  // Global modals
  const [showQuickAction, setShowQuickAction] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const navigateToTab = useCallback((tab, params = {}) => {
    setActiveTab(tab);
    setTabParams(params);
  }, []);

  const handleQuickAction = useCallback((tab, params = {}) => {
    navigateToTab(tab, params);
  }, [navigateToTab]);

  const handleSearchNavigate = useCallback((tab, params = {}) => {
    navigateToTab(tab, params);
  }, [navigateToTab]);

  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div className="spinner spinner-gold" style={{ width: '48px', height: '48px' }} />
        <p
          style={{
            marginTop: '1.25rem',
            color: 'var(--color-primary)',
            fontSize: '1rem',
            fontWeight: '700',
            letterSpacing: '0.02em',
          }}
        >
          BALAJI DAIRY MANAGEMENT SYSTEM
        </p>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
          डेयरी सिस्टम लोड हो रहा है...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Active view switcher with role safeguards
  const renderActiveView = () => {
    const isOwner = user?.role === 'owner';
    const isManager = user?.role === 'manager' || isOwner;

    // Worker restrictions
    if (user?.role === 'worker') {
      const allowedWorkerTabs = [
        'dashboard',
        'collection',
        'suppliers',
        'daily-delivery',
        'customers',
        'internal-use',
      ];
      if (!allowedWorkerTabs.includes(activeTab)) {
        return <Dashboard onNavigate={navigateToTab} onOpenQuickAction={() => setShowQuickAction(true)} />;
      }
    }

    // Manager restrictions
    if (user?.role === 'manager') {
      const restrictedForManager = ['users', 'audit-logs', 'profit-analytics'];
      if (restrictedForManager.includes(activeTab)) {
        return <Dashboard onNavigate={navigateToTab} onOpenQuickAction={() => setShowQuickAction(true)} />;
      }
    }

    switch (activeTab) {
      // Overview
      case 'dashboard':
        return <Dashboard onNavigate={navigateToTab} onOpenQuickAction={() => setShowQuickAction(true)} />;

      // Procurement
      case 'collection':
        return <MilkCollection key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'suppliers':
        return <Suppliers key={JSON.stringify(tabParams)} initialParams={tabParams} onNavigate={navigateToTab} />;
      case 'supplier-ledger':
        return <SupplierLedger key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'supplier-payments':
        return <SupplierPayments key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'rate-chart':
        return <RateChart />;

      // Sales
      case 'daily-delivery':
        return <DailyDelivery key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'customers':
        return <Customers key={JSON.stringify(tabParams)} initialParams={tabParams} onNavigate={navigateToTab} />;
      case 'customer-payments':
        return <CustomerPayments key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'customer-ledger':
        return <CustomerLedger key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'billing':
        return <CustomerBilling key={JSON.stringify(tabParams)} initialParams={tabParams} />;

      // Operations
      case 'reconciliation':
        return <MilkReconciliation />;
      case 'internal-use':
        return <InternalMilkUse key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'quality-tests':
        return <QualityTests key={JSON.stringify(tabParams)} initialParams={tabParams} />;
      case 'expenses':
        return <Expenses key={JSON.stringify(tabParams)} initialParams={tabParams} />;

      // Analytics & Hub
      case 'reports':
        return <Reports />;
      case 'profit-analytics':
        return <ProfitAnalytics />;

      // Admin
      case 'users':
        return <UserManagement />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;

      default:
        return <Dashboard onNavigate={navigateToTab} onOpenQuickAction={() => setShowQuickAction(true)} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Fixed Desktop Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={navigateToTab} />

      {/* Main App Container */}
      <div className="main-wrapper">
        {/* Top Header */}
        <AppHeader
          activeTab={activeTab}
          onOpenQuickAction={() => setShowQuickAction(true)}
          onOpenSearch={() => setShowSearch(true)}
        />

        {/* Dynamic Page View Area */}
        <main className="content-container">
          {renderActiveView()}
        </main>

        {/* Mobile Bottom Navigation (5 core tabs + More Drawer) */}
        <BottomNavigation activeTab={activeTab} setActiveTab={navigateToTab} />

        {/* Global Quick Action + ADD Modal */}
        <QuickActionModal
          isOpen={showQuickAction}
          onClose={() => setShowQuickAction(false)}
          onActionSelect={handleQuickAction}
        />

        {/* Global Search Modal (⌘K / Ctrl+K) */}
        <GlobalSearchModal
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onNavigate={handleSearchNavigate}
        />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
