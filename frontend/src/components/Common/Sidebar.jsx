import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Milk, Users, WalletCards, BarChart3, UserCog, Settings, LogOut, ShieldCheck } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const groups = [
    {
      title: 'Operations / संचालन',
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'collection', name: 'Milk Collection', icon: Milk },
        { id: 'suppliers', name: 'Suppliers / Farmers', icon: Users },
      ],
    },
    {
      title: 'Financials / हिसाब',
      items: [
        { id: 'payments', name: 'Payment Ledger', icon: WalletCards },
        { id: 'reports', name: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Control / नियंत्रण',
      items: [
        { id: 'users', name: 'User Management', icon: UserCog },
        { id: 'settings', name: 'Settings & Audit', icon: Settings },
      ],
    },
  ];

  const allowed = (id) => {
    if (user?.role === 'worker') return ['dashboard', 'collection', 'suppliers'].includes(id);
    if (user?.role === 'manager') return ['dashboard', 'collection', 'suppliers', 'payments', 'reports'].includes(id);
    return true;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><Milk size={22} strokeWidth={2.3} /></div>
        <div className="brand-text">
          <h2>BALAJI DAIRY</h2>
          <span>Milk Collection & Billing</span>
        </div>
      </div>

      <div className="sidebar-user-card">
        <div className="avatar">{user?.name ? user.name[0].toUpperCase() : 'B'}</div>
        <div className="user-info">
          <span className="user-name">{user?.name || 'Balaji User'}</span>
          <span className="user-role">{user?.role === 'owner' ? 'Owner' : user?.role === 'manager' ? 'Manager' : 'Worker'}</span>
        </div>
        {user?.role === 'owner' && <ShieldCheck size={17} className="owner-shield" />}
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => {
          const visible = group.items.filter((item) => allowed(item.id));
          if (!visible.length) return null;
          return (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                    <Icon size={18} strokeWidth={2.1} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-logout" onClick={logout}><LogOut size={17} /><span>Logout</span></button>
        <div className="sidebar-version"><strong>Balaji Dairy</strong><span>Supabase Edition • v2</span></div>
      </div>
    </aside>
  );
};

export default Sidebar;
