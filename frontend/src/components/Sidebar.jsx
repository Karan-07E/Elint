import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LuLayoutDashboard, 
  LuBox, 
  LuLandmark, 
  LuTrendingUp, 
  LuShoppingCart, 
  LuChartPie,
  LuReceipt, 
  LuFileChartColumn, 
  LuWarehouse, 
  LuClipboardList, 
  LuSettings, 
  LuLogOut, 
  LuSearch,
  LuChevronRight,
  LuChevronDown,
  LuUsers,
  LuCalendarDays,
  LuHexagon // Professional Logo Icon
} from "react-icons/lu";
import { hasPermission } from '../utils/permissions';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // --- Deterministic Sidebar State ---
  const [explicitAccountsOpen, setExplicitAccountsOpen] = useState(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  // Derived: Is the user currently inside the Accounts section?
  const isAccountsRoute = location.pathname.startsWith('/accounts') || 
                          location.pathname.startsWith('/parties') ||
                          location.pathname.startsWith('/sale') ||
                          location.pathname.startsWith('/purchase') ||
                          location.pathname.startsWith('/expenses') ||
                          location.pathname.startsWith('/cash-bank');

  // Final Computed State for Accounts Sidebar
  const isAccountsOpen = explicitAccountsOpen !== null 
    ? explicitAccountsOpen 
    : isAccountsRoute;

  // Handlers
  const handleAccountsHeaderClick = () => {
    setExplicitAccountsOpen(!isAccountsOpen);
  };

  const handleTopLevelClick = () => {
    setExplicitAccountsOpen(null);
  };

  React.useEffect(() => {
    if (location.pathname.startsWith('/purchase')) setIsPurchaseOpen(true);
  }, [location.pathname]);

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

  // Define menu items with professional structure and icons
  const allMenuItems = [
    // 1. Home
    { 
      path: '/home', 
      icon: <LuLayoutDashboard size={20} />, 
      label: 'Home', 
      roles: ['user', 'admin'], 
      permission: null 
    },
    
    // 2. Items
    { 
      path: '/items', 
      icon: <LuBox size={20} />, 
      label: 'Items', 
      roles: ['user', 'admin', 'accounts team', 'employee', 'product team'], 
      permission: 'viewItems' 
    },

    // 2.5 My Orders (Employee View)
    {
      path: '/employee/dashboard',
      icon: <LuClipboardList size={20} />,
      label: 'My Orders',
      roles: ['employee'], 
      permission: null
    },

    // 3. Accounts (Dropdown)
    { 
      path: null, 
      icon: <LuLandmark size={20} />, 
      label: 'Accounts', 
      roles: ['user', 'admin', 'accounts team'],
      permission: null, 
      isDropdown: true,
      stateKey: 'accounts',
      subItems: [
        // Sales
        { 
          path: '/sale/new', 
          icon: <LuTrendingUp size={18} />, 
          label: 'Sales', 
          roles: ['user', 'admin', 'accounts team'], 
          permission: 'viewSales' 
        },
        // Parties
        { 
          path: '/parties', 
          icon: <LuUsers size={18} />, 
          label: 'Parties', 
          roles: ['user', 'admin', 'accounts team'], 
          permission: 'viewParties' 
        },
        
        // Purchases (Nested Dropdown)
        { 
          path: null, 
          icon: <LuShoppingCart size={18} />, 
          label: 'Purchases', 
          roles: ['user', 'admin', 'accounts team'],
          permission: 'viewPurchases',
          isNestedDropdown: true,
          stateKey: 'purchase',
          subItems: [
            { path: '/purchase', icon: <LuChartPie size={16} />, label: 'Purchase Dashboard', roles: ['user', 'admin', 'accounts team'], permission: 'viewPurchases' },
            { path: '/purchase/new', icon: <LuReceipt size={16} />, label: 'Purchase Bills', roles: ['user', 'admin', 'accounts team'], permission: 'viewPurchases' },
          ]
        },

        // Accounts Report
        { 
          path: '/reports', 
          icon: <LuFileChartColumn size={18} />, 
          label: 'Reports', 
          roles: ['user', 'admin', 'accounts team'], 
          permission: 'viewReports' 
        },

        // Manage Orders (For Accounts)
        {
          path: '/accounts/manage-orders',
          icon: <LuClipboardList size={18} />,
          label: 'Manage Orders',
          roles: ['accounts team'],
          permission: null
        },

        // Inventory
        { 
          path: '/items', // Reusing items path
          icon: <LuWarehouse size={18} />, 
          label: 'Inventory', 
          roles: ['user', 'admin', 'accounts team'], 
          permission: 'viewItems' 
        },
      ]
    },
    
    // 4. Orders
    { 
      path: '/orders', 
      icon: <LuClipboardList size={20} />, 
      label: 'Orders', 
      roles: ['user', 'admin', 'product team', 'accounts team'], 
      permission: 'viewOrders' 
    },

    // 5. Order Calendar
    {
      path: '/calendar',
      icon: <LuCalendarDays size={20} />,
      label: 'Calendar',
      roles: ['user', 'admin', 'accounts team', 'employee', 'product team'],
      permission: null
    },

    // 5.5. Progress (Employee Only)
    {
      path: '/employee/progress',
      icon: <LuChartPie size={20} />,
      label: 'Progress',
      roles: ['employee'],
      permission: null
    },

    // 6. Settings (General Access)
    { 
      path: '/settings', 
      icon: <LuSettings size={20} />,
      label: 'Settings', 
      roles: ['user', 'admin', 'accounts team', 'product team'], 
      permission: 'viewSettings' 
    },

    // 7. Manage Teams (Admin Only)
    { 
      path: '/manage-teams', 
      icon: <LuUsers size={20} />, 
      label: 'Manage Teams', 
      roles: ['admin'], 
      permission: 'manageUsers' 
    },
  ];

  // Filter menu items based on user role AND permissions
  const menuItems = allMenuItems.filter(item => {
    if (!item.roles.includes(userRole)) return false;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }).map(item => {
    if (item.isDropdown && item.subItems) {
      const filteredSubItems = item.subItems.filter(subItem => {
        if (!subItem.roles.includes(userRole)) return false;
        if (!subItem.permission) return true;
        return hasPermission(subItem.permission);
      }).map(subItem => {
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
      
      if (filteredSubItems.length === 0) return null;
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  }).filter(item => item !== null);

  return (
    <div className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50 font-sans shadow-xl">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 mb-5 px-1">
          {/* Logo Placeholder */}
          <div className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-blue-600 to-slate-800 border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <LuHexagon className="text-white w-6 h-6 drop-shadow-md" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Elints ERP</span>
        </div>
        
        <div className="relative group">
          <LuSearch className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-slate-800 text-slate-200 text-xs rounded-lg px-3 pl-9 py-2.5 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1 px-3">
          {menuItems.map((item, index) => {
            if (item.isDropdown) {
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
                <li key={`dropdown-${index}`}>
                  <div
                    onClick={handleAccountsHeaderClick}
                    className={`
                      flex items-center justify-between relative py-3 px-3 rounded-lg cursor-pointer transition-all duration-200 group
                      ${isAnySubItemActive || isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${isAnySubItemActive || isOpen ? 'text-blue-500' : 'text-slate-500 group-hover:text-blue-400'}`}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <LuChevronRight 
                      size={14} 
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-500' : 'text-slate-600'}`} 
                    />
                  </div>
                  
                  {/* Dropdown Content */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <ul className="space-y-1 pl-3 border-l-2 border-slate-800 ml-5">
                      {item.subItems.map((subItem, subIndex) => {
                        if (subItem.isNestedDropdown) {
                          // Nested Dropdown (Purchases)
                          const isNestedOpen = isPurchaseOpen;
                          const isAnyNestedActive = subItem.subItems.some(nested => location.pathname === nested.path);
                          
                          return (
                            <li key={`nested-${subIndex}`}>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsPurchaseOpen(!isPurchaseOpen);
                                }}
                                className={`
                                  flex items-center justify-between py-2 px-3 rounded-md cursor-pointer transition-colors text-sm group/nested
                                  ${isAnyNestedActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}
                                `}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={isAnyNestedActive ? 'text-blue-500' : 'text-slate-600 group-hover/nested:text-blue-400'}>
                                    {subItem.icon}
                                  </span>
                                  <span>{subItem.label}</span>
                                </div>
                                <LuChevronDown size={12} className={`transition-transform ${isNestedOpen ? 'rotate-180' : ''}`} />
                              </div>
                              
                              {/* Nested Content */}
                              {isNestedOpen && (
                                <ul className="mt-1 space-y-1 pl-3 border-l border-slate-800 ml-4 bg-slate-900/50 py-1 rounded-r-lg">
                                  {subItem.subItems.map((nestedItem) => {
                                    const isNestedActive = location.pathname === nestedItem.path;
                                    return (
                                      <li key={nestedItem.path}>
                                        <Link
                                          to={nestedItem.path}
                                          className={`
                                            flex items-center gap-3 py-2 px-3 rounded-md text-xs transition-all
                                            ${isNestedActive 
                                              ? 'bg-blue-600/10 text-blue-400 font-medium' 
                                              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
                                          `}
                                        >
                                          <span className={isNestedActive ? 'text-blue-500' : 'text-slate-600'}>
                                            {nestedItem.icon}
                                          </span>
                                          {nestedItem.label}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        }
                        
                        // Regular Sub Item
                        const isSubActive = location.pathname === subItem.path;
                        return (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`
                                flex items-center gap-3 py-2 px-3 rounded-md text-sm transition-all
                                ${isSubActive 
                                  ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/20' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                              `}
                            >
                              <span className={isSubActive ? 'text-white' : 'text-slate-500'}>
                                {subItem.icon}
                              </span>
                              {subItem.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }
            
            // Regular Top Level Menu Item
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={handleTopLevelClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <span className={`
                    text-lg transition-colors
                    ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}
                  `}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-sm">{item.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="bg-slate-800/50 rounded-xl p-3 mb-2 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors border border-slate-800 hover:border-slate-700">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            {initial}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-slate-200 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize truncate">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-red-400 py-2.5 hover:bg-red-500/10 rounded-lg transition-all duration-200"
        >
          <LuLogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;