import { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Common/Sidebar';
import BottomNavigation from './components/Common/BottomNavigation';
import Login from './components/Auth/Login';
import './App.css';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const MilkCollection = lazy(() => import('./components/MilkCollection/MilkCollection'));
const Suppliers = lazy(() => import('./components/Suppliers/Suppliers'));
const Payments = lazy(() => import('./components/Payments/Payments'));
const Reports = lazy(() => import('./components/Reports/Reports'));
const Settings = lazy(() => import('./components/Settings/Settings'));
const UserManagement = lazy(() => import('./components/UserManagement/UserManagement'));
const RateChart = lazy(() => import('./components/RateChart/RateChart'));

const PageLoading = () => (
  <div className="loading-container" style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
    <div className="spinner"></div>
    <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>Loading page...</p>
  </div>
);

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
    if (user?.role === 'worker' && !['dashboard', 'collection', 'suppliers', 'settings'].includes(activeTab)) {
      return <Dashboard />;
    }
    if (user?.role === 'manager' && !['dashboard', 'collection', 'suppliers', 'payments', 'reports', 'settings'].includes(activeTab)) {
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
      case 'rates':
        return <RateChart />;
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
      case 'rates': return 'Milk Rate Chart';
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
              {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <div className="topbar-avatar" title={user?.role?.toUpperCase()}>
              {user?.name ? user.name[0].toUpperCase() : 'B'}
            </div>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="content-container">
          <Suspense fallback={<PageLoading />}>
            {renderActiveView()}
          </Suspense>
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
