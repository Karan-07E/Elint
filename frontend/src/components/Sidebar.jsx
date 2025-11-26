import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LuLayoutDashboard, 
  LuUsers, 
  LuBox, 
  LuFileText, 
  LuShoppingCart, 
  LuReceipt, 
  LuBanknote, 
  LuClipboardList, 
  LuUndo2, 
  LuZap, 
  LuCreditCard, 
  LuLandmark, 
  LuStore, 
  LuChartBar, // ✅ Corrected from LuBarChart
  LuWrench, 
  LuSettings, 
  LuLogOut, 
  LuSearch,
  LuChevronRight
} from "react-icons/lu";

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

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();
  const displayName = stored.name || stored.email || 'User';
  const initial = (displayName || 'U').toString().trim().charAt(0).toUpperCase();
  const userRole = stored.role || 'user';

  // Define menu items with React Icons
  const allMenuItems = [
    { path: '/home', icon: <LuLayoutDashboard />, label: 'Home', roles: ['user', 'admin'] },
    { path: '/orders', icon: <LuClipboardList />, label: 'Order Manager', roles: ['user', 'admin'] }, 
    { path: '/parties', icon: <LuUsers />, label: 'Parties', roles: ['user', 'admin'] },
    { path: '/items', icon: <LuBox />, label: 'Items', roles: ['user', 'admin', 'product team'] },
    { path: '/sale/new', icon: <LuFileText />, label: 'Sale', roles: ['user', 'admin'] },
    
    // Purchase Section
    { path: '/purchase', icon: <LuShoppingCart />, label: 'Purchase', roles: ['user', 'admin'] },
    { path: '/purchase/new', icon: <LuReceipt />, label: 'Purchase Bills', roles: ['user', 'admin'], indent: true },
    // { path: '/payment-out', icon: <LuBanknote />, label: 'Payment Out', roles: ['user', 'admin'], indent: true },
    // { path: '/purchase-order', icon: <LuClipboardList />, label: 'Purchase Order', roles: ['user', 'admin'], indent: true },
    // { path: '/purchase-return', icon: <LuUndo2 />, label: 'Purchase Return', roles: ['user', 'admin'], indent: true },
    
    // { path: '/quick-billing', icon: <LuZap />, label: 'Quick Billing', roles: ['user', 'admin'] },
    // { path: '/expenses', icon: <LuCreditCard />, label: 'Expenses', roles: ['user', 'admin'] },
    // { path: '/cash-bank', icon: <LuLandmark />, label: 'Cash & Bank', roles: ['user', 'admin'] },
    // { path: '/my-online-store', icon: <LuStore />, label: 'My Online Store', roles: ['user', 'admin'] },
    { path: '/reports', icon: <LuChartBar />, label: 'Reports', roles: ['user', 'admin'] }, // ✅ Used LuChartBar
    { path: '/utilities', icon: <LuWrench />, label: 'Utilities', roles: ['user', 'admin'] },
    { path: '/settings', icon: <LuSettings />, label: 'Settings', roles: ['user', 'admin', 'product team'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="w-64 bg-slate-800 text-gray-300 h-screen flex flex-col fixed left-0 top-0 border-r border-slate-700 z-50">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3 mb-4 px-1">
          <span className="text-2xl"></span>
          <span className="text-xl font-bold text-white tracking-tight">Elints</span>
        </div>
        
        <div className="relative group">
          <LuSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search (Ctrl+K)" 
            className="w-full bg-slate-700 text-slate-200 text-xs rounded px-3 pl-9 py-2 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const active = item.path === '/purchase' 
            ? location.pathname.startsWith('/purchase') 
            : location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center px-5 py-2.5 cursor-pointer transition-colors relative
                ${active 
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500' 
                  : 'hover:bg-slate-700/50 text-slate-300 border-l-4 border-transparent'
                }
                ${item.indent ? 'pl-10 text-sm' : ''}
              `}
            >
              <span className={`
                mr-3 text-lg
                ${active ? 'text-blue-400' : 'text-slate-400'}
                ${item.indent ? 'text-base' : ''}
              `}>
                {item.icon}
              </span>
              
              <span className="flex-1 truncate font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="bg-slate-700/30 rounded-md p-2 mb-2 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 transition-colors">
          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {initial}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 capitalize truncate">{userRole}</p>
          </div>
          <LuChevronRight className="text-slate-500" size={16} />
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-red-400 py-2 hover:bg-red-500/10 rounded transition-colors"
        >
          <LuLogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;