import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('authChange'));
      navigate('/login');
    }
  };

  // Read stored user details
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();
  const displayName = stored.name || stored.email || 'Asd';
  const initial = (displayName || 'A').toString().trim().charAt(0).toUpperCase();
  const userRole = stored.role || 'user';
  const profilePhoto = stored.profilePhoto || '';

  // Define all menu items with role-based access
  const allMenuItems = [
    { path: '/home', icon: '🏠', label: 'Home', roles: ['user', 'admin'] },
    { path: '/parties', icon: '👥', label: 'Parties', roles: ['user', 'admin'] },
    { path: '/items', icon: '📦', label: 'Items', roles: ['user', 'admin', 'product team'] },
    { path: '/sale/new', icon: '📝', label: 'Sale', roles: ['user', 'admin'] },
    
    // Purchase section with sub-items
    { path: '/purchase', icon: '🛒', label: 'Purchase', roles: ['user', 'admin'] },
    { path: '/purchase/new', icon: '🧾', label: 'Purchase Bills', roles: ['user', 'admin'], indent: true },
    { path: '/payment-out', icon: '💸', label: 'Payment Out', roles: ['user', 'admin'], indent: true },
    { path: '/purchase-order', icon: '📋', label: 'Purchase Order', roles: ['user', 'admin'], indent: true },
    { path: '/purchase-return', icon: '↩️', label: 'Purchase Return', roles: ['user', 'admin'], indent: true },
    
    { path: '/quick-billing', icon: '⚡', label: 'Quick Billing', roles: ['user', 'admin'] },
    { path: '/expenses', icon: '💳', label: 'Expenses', roles: ['user', 'admin'] },
    { path: '/cash-bank', icon: '💰', label: 'Cash & Bank', roles: ['user', 'admin'] },
    { path: '/my-online-store', icon: '🏪', label: 'My Online Store', roles: ['user', 'admin'] },
    { path: '/reports', icon: '📊', label: 'Reports', roles: ['user', 'admin'] },
    { path: '/utilities', icon: '🔧', label: 'Utilities', roles: ['user', 'admin'] },
    { path: '/settings', icon: '⚙️', label: 'Settings', roles: ['user', 'admin', 'product team'] },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="w-64 bg-slate-800 text-white h-screen flex flex-col overflow-y-auto fixed left-0 top-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🔥</span>
          <span className="text-xl font-bold text-orange-500">Elints</span>
        </div>
        <button className="w-full bg-white/10 hover:bg-white/20 text-white text-xs rounded px-2 py-2">
          Open Anything (Ctrl+F)
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center relative py-3 cursor-pointer transition-colors ${
                isActive ? 'bg-orange-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
              } ${item.indent ? 'pl-12' : 'pl-5'}`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 w-1 h-8 bg-orange-500 rounded-r-full"></div>
              )}
              
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="flex-1 text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <Link to="/settings" className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 cursor-pointer transition-colors mb-2 block">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                  {initial}
                </div>
              )}
              <span className="flex-1 ml-2 text-sm font-medium">{displayName}</span>
              <span className="text-white/60 text-lg">›</span>
            </div>
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 rounded-md flex items-center justify-center gap-2 transition-colors"
        >
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;