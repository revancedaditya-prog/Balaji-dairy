import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import MilkCollection from './components/MilkCollection/MilkCollection';
import './App.css';
import './components/Common/SimpleApp.css';

const MainApp = () => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="milk-app-loading">
        <div className="milk-app-spinner" />
        <span>Starting Balaji Dairy…</span>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="milk-entry-app">
      <header className="simple-app-header">
        <div className="simple-app-brand">
          <span className="simple-app-brand-mark">BD</span>
          <div>
            <strong>BALAJI DAIRY</strong>
            <span>Milk Data Entry</span>
          </div>
        </div>
        <button type="button" className="simple-app-logout" onClick={logout}>Logout</button>
      </header>
      <main className="simple-app-content">
        <MilkCollection />
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default App;
