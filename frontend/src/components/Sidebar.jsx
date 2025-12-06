import React, { useState } from 'react';
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
import { hasPermission } from '../utils/permissions';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

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


  // Define all menu items with permission-based access
  const allMenuItems = [
    { path: '/home', icon: '🏠', label: 'Home', roles: ['user', 'admin'], permission: null },
    
    // Accounts section with dropdown
    { 
      path: null, 
      icon: '💼', 
      label: 'Accounts', 
      roles: ['user', 'admin', 'accounts team', 'accounts employee'],
      permission: null, // Show if any sub-item is accessible
      isDropdown: true,
      stateKey: 'accounts',
      subItems: [
        { path: '/items', icon: '📦', label: 'Items', roles: ['user', 'admin', 'accounts team', 'accounts employee', 'product team', 'product employee'], permission: 'viewItems' },
        { path: '/parties', icon: '👥', label: 'Parties', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewParties' },
        { path: '/sale/new', icon: '📝', label: 'Sales', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewSales' },
        { 
          path: null, 
          icon: '🛒', 
          label: 'Purchase', 
          roles: ['user', 'admin', 'accounts team', 'accounts employee'],
          permission: 'viewPurchases',
          isNestedDropdown: true,
          stateKey: 'purchase',
          subItems: [
            { path: '/purchase', icon: '📂', label: 'Purchase Dashboard', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewPurchases' },
            { path: '/purchase/new', icon: '🧾', label: 'Purchase Bills', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewPurchases' },
            { path: '/payment-out', icon: '💸', label: 'Payment Out', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewPurchases' },
            { path: '/purchase-order', icon: '📋', label: 'Purchase Order', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewPurchases' },
            { path: '/purchase-return', icon: '↩️', label: 'Purchase Return', roles: ['user', 'admin', 'accounts team', 'accounts employee'], permission: 'viewPurchases' },
          ]
        },
      ]
    },
    
    { path: '/manage-teams', icon: '👨‍💼', label: 'Manage Teams', roles: ['admin'], permission: 'manageUsers' },
    { path: '/quick-billing', icon: '⚡', label: 'Quick Billing', roles: ['user', 'admin'], permission: null },
    { path: '/expenses', icon: '💳', label: 'Expenses', roles: ['user', 'admin'], permission: null },
    { path: '/cash-bank', icon: '💰', label: 'Cash & Bank', roles: ['user', 'admin'], permission: null },
    { path: '/my-online-store', icon: '🏪', label: 'My Online Store', roles: ['user', 'admin'], permission: null },
    { path: '/reports', icon: '📊', label: 'Reports', roles: ['user', 'admin'], permission: 'viewReports' },
    { path: '/utilities', icon: '🔧', label: 'Utilities', roles: ['user', 'admin'], permission: null },
    { path: '/settings', icon: '⚙️', label: 'Settings', roles: ['user', 'admin', 'product team', 'product employee', 'accounts team', 'accounts employee'], permission: 'viewSettings' },
  ];

  // Filter menu items based on user role AND permissions
  const menuItems = allMenuItems.filter(item => {
    // Check role first
    if (!item.roles.includes(userRole)) return false;
    
    // If no permission required, show it
    if (!item.permission) return true;
    
    // Check if user has the permission
    return hasPermission(item.permission);
  }).map(item => {
    // Filter sub-items if dropdown
    if (item.isDropdown && item.subItems) {
      const filteredSubItems = item.subItems.filter(subItem => {
        if (!subItem.roles.includes(userRole)) return false;
        if (!subItem.permission) return true;
        return hasPermission(subItem.permission);
      }).map(subItem => {
        // Filter nested sub-items if nested dropdown
        if (subItem.isNestedDropdown && subItem.subItems) {
          const filteredNestedItems = subItem.subItems.filter(nestedItem => {
            if (!nestedItem.roles.includes(userRole)) return false;
            if (!nestedItem.permission) return true;
            return hasPermission(nestedItem.permission);
          });
          return { ...subItem, subItems: filteredNestedItems };
        }
        return subItem;
      });
      
      // Only show dropdown if it has accessible sub-items
      if (filteredSubItems.length === 0) return null;
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  }).filter(item => item !== null);

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

      {/* Navigation Menu */}
      <nav className="flex-1 py-2">
        {menuItems.map((item, index) => {
          if (item.isDropdown) {
            // Render main dropdown menu (Accounts)
            const checkActive = (items) => {
              return items.some(sub => {
                if (sub.path === location.pathname) return true;
                if (sub.isNestedDropdown && sub.subItems) {
                  return sub.subItems.some(nested => nested.path === location.pathname);
                }
                return false;
              });
            };
            
            const isAnySubItemActive = checkActive(item.subItems);
            const isOpen = isAccountsOpen;
            
            return (
              <div key={`dropdown-${index}`}>
                <div
                  onClick={() => setIsAccountsOpen(!isAccountsOpen)}
                  className={`flex items-center relative py-3 cursor-pointer transition-colors ${
                    isAnySubItemActive ? 'bg-orange-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
                  } pl-5`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className={`mr-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </div>
                
                {isOpen && (
                  <div className="bg-slate-900/50" onClick={(e) => e.stopPropagation()}>
                    {item.subItems.filter(sub => sub.roles.includes(userRole)).map((subItem, subIndex) => {
                      if (subItem.isNestedDropdown) {
                        // Render nested dropdown (Purchase)
                        const isAnyNestedActive = subItem.subItems.some(nested => location.pathname === nested.path);
                        const isNestedOpen = isPurchaseOpen;
                        
                        return (
                          <div key={`nested-${subIndex}`}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsPurchaseOpen(!isPurchaseOpen);
                              }}
                              className={`flex items-center relative py-2 cursor-pointer transition-colors ${
                                isAnyNestedActive ? 'bg-orange-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
                              } pl-12`}
                            >
                              <span className="mr-3 text-base">{subItem.icon}</span>
                              <span className="flex-1 text-sm">{subItem.label}</span>
                              <span className={`mr-4 transition-transform text-xs ${isNestedOpen ? 'rotate-90' : ''}`}>›</span>
                            </div>
                            
                            {isNestedOpen && (
                              <div className="bg-slate-900/70" onClick={(e) => e.stopPropagation()}>
                                {subItem.subItems.filter(nested => nested.roles.includes(userRole)).map((nestedItem) => {
                                  const isNestedActive = location.pathname === nestedItem.path;
                                  return (
                                    <Link
                                      key={nestedItem.path}
                                      to={nestedItem.path}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`flex items-center relative py-2 cursor-pointer transition-colors ${
                                        isNestedActive ? 'bg-orange-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
                                      } pl-16`}
                                    >
                                      {isNestedActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full"></div>
                                      )}
                                      <span className="mr-3 text-sm">{nestedItem.icon}</span>
                                      <span className="flex-1 text-xs">{nestedItem.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Render regular sub-item
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center relative py-2 cursor-pointer transition-colors ${
                            isSubActive ? 'bg-orange-500/20 text-white' : 'text-gray-300 hover:bg-white/10'
                          } pl-12`}
                        >
                          {isSubActive && (
                            <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-full"></div>
                          )}
                          <span className="mr-3 text-base">{subItem.icon}</span>
                          <span className="flex-1 text-sm">{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          // Render regular menu item
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center px-5 py-2.5 cursor-pointer transition-colors relative
                ${isActive 
                  ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500' 
                  : 'hover:bg-slate-700/50 text-slate-300 border-l-4 border-transparent'
                }
                ${item.indent ? 'pl-10 text-sm' : ''}
              `}
            >
              <span className={`
                mr-3 text-lg
                ${isActive ? 'text-blue-400' : 'text-slate-400'}
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