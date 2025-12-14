import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders, assignOrder } from '../services/api';

// --- Helpers ---

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString() : '-';
};

const computeOrderDates = (order) => {
  const start = toDate(order.poDate);
  const candidates = [];
  if (order.estimatedDeliveryDate) {
    const est = toDate(order.estimatedDeliveryDate);
    if (est) candidates.push(est);
  }
  if (Array.isArray(order.items)) {
    order.items.forEach((it) => {
      if (it && it.deliveryDate) {
        const d = toDate(it.deliveryDate);
        if (d) candidates.push(d);
      }
    });
  }
  const deadline = candidates.length
    ? new Date(Math.max(...candidates.map((d) => d.getTime())))
    : start;
  return { start, deadline };
};

const isUnassignedOrder = (order) => {
  return !(
    order.assignedAccountEmployee ||
    order.accountsEmployee ||
    order.assignedTo ||
    (order.assignee && (order.assignee._id || order.assignee.id))
  );
};

// --- Components ---

const PriorityBadge = ({ priority }) => {
  const p = (priority || 'Normal').toLowerCase();
  let classes = 'bg-slate-100 text-slate-600';
  if (p === 'high') classes = 'bg-red-50 text-red-600 border border-red-100';
  else if (p === 'medium') classes = 'bg-amber-50 text-amber-600 border border-amber-100';
  else if (p === 'low') classes = 'bg-emerald-50 text-emerald-600 border border-emerald-100';

  return (
    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${classes}`}>
      {priority || 'Normal'}
    </span>
  );
};

const OrderCard = ({ order, employees, onAssign, isExpanded, onToggle, selectedEmployeeId, domRef, isHighlighted }) => {
  const [assigneeId, setAssigneeId] = useState(selectedEmployeeId || '');
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (selectedEmployeeId) setAssigneeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const { start, deadline } = computeOrderDates(order);
  const customer = order.customerName || order.party?.name || 'Customer';
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const derivedPriority = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal');

  const handleAssign = () => {
    if (!assigneeId) return;
    setIsExiting(true);
    // Wait for animation to finish before calling parent handler
    setTimeout(() => {
      onAssign(order._id, assigneeId);
    }, 300);
  };

  if (isExiting) {
    return <div className="transition-all duration-300 transform scale-95 opacity-0 h-0 overflow-hidden margin-0 padding-0" />;
  }

  return (
    <div
      ref={domRef}
      className={`bg-white rounded-[18px] border transition-all duration-500 mb-4 overflow-hidden 
      ${isExpanded ? 'ring-2 ring-blue-50 border-blue-100' : 'border-slate-100'} 
      ${isHighlighted ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.3),0_10px_15px_-3px_rgba(59,130,246,0.1)] scale-[1.02] border-blue-200 z-10' : 'shadow-sm hover:shadow-md'}`}
    >
      {/* Header (Always Visible) */}
      <div
        onClick={onToggle}
        className="p-5 cursor-pointer flex items-center justify-between bg-white hover:bg-slate-50/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-blue-600 bg-blue-50`}>
            <span className="font-bold text-sm">PO</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{order.poNumber || 'N/A'}</h3>
            <p className="text-xs text-slate-500">{customer}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Deadline</p>
            <p className={`text-xs font-medium ${deadline && new Date(deadline) < new Date() ? 'text-red-500' : 'text-slate-600'}`}>
              {formatDate(deadline)}
            </p>
          </div>

          <PriorityBadge priority={derivedPriority} />

          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-0 animate-fadeIn">
          <div className="h-px w-full bg-slate-100 mb-4" />

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Left Col: Details */}
            <div className="flex-1 space-y-4">
              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Start Date</span>
                  <span className="text-xs font-medium text-slate-700">{formatDate(start)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Amount</span>
                  <span className="text-xs font-bold text-slate-700">₹{(order.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Delivery</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700">{item.itemName || item.name}</td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(item.deliveryDate)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Col: Action */}
            <div className="w-full xl:w-64 flex flex-col justify-end space-y-3">
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-50 flex flex-col gap-3">
                <label className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">Assign To Employee</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Select Account Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!assigneeId}
                  className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium shadow-md shadow-green-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-300 disabled:opacity-50 disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Assign Order</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeCard = ({ employee, stats, isSelected, onClick }) => {
  const status = stats.pending > 0 ? 'Busy' : 'Available';
  const isBusy = status === 'Busy';

  return (
    <div className="flex flex-col">
      <div
        onClick={onClick}
        className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden z-10 ${isSelected
          ? 'bg-white border-blue-100 ring-2 ring-blue-50 shadow-md transform scale-[1.01]'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
          }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
            }`}>
            {employee.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                {employee.name}
              </h4>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isBusy ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {status}
              </span>
            </div>
            <p className={`text-xs truncate ${isSelected ? 'text-blue-700/80' : 'text-slate-400'}`}>
              {employee.email}
            </p>
          </div>
        </div>
      </div>

      {/* Inline Details Panel - Dynamic Stats */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSelected ? 'max-h-96 opacity-100 mt-2 mb-4' : 'max-h-0 opacity-0'}`}>
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mx-1">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Total Assigned</p>
              <p className="text-lg font-bold text-slate-700">{stats.total}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Pending Orders</p>
              <p className="text-lg font-bold text-amber-500">{stats.pending}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold">Full Name</p>
              <p className="text-xs font-medium text-slate-700">{employee.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-semibold">Employee ID</p>
                <p className="text-xs font-medium text-slate-700 font-mono">{employee.employeeId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-semibold">Role</p>
                <p className="text-xs font-medium text-slate-700 capitalize">{employee.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-semibold">Joined</p>
                <p className="text-xs font-medium text-slate-700">{formatDate(employee.date)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-semibold">Completed</p>
                <p className="text-xs font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

const AccountsTeamManage = () => {
  const [searchParams] = useSearchParams();
  const orderRefs = useRef({});

  const [allOrders, setAllOrders] = useState([]); // Store ALL orders for stats
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const ordersRes = await getAllOrders(); // Axios response

      // Fetch employees
      let employeesData = [];
      if (token) {
        try {
          const usersRes = await fetch('/api/users/team/employees', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (usersRes.ok) employeesData = await usersRes.json();
        } catch (e) {
          console.error('Failed to fetch employees', e);
        }
      }

      const rawOrders = ordersRes.data || [];
      setAllOrders(rawOrders); // Keep all for stats

      const accountsEmps = (employeesData || []).filter((u) => u.role === 'accounts employee');
      setEmployees(accountsEmps);
      setError(null);
    } catch (err) {
      console.error('Failed to load data', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle "Jump to Order" from URL
  useEffect(() => {
    const jumpId = searchParams.get('jump');
    if (jumpId && !loading && allOrders.length > 0) {
      // Find order and check if unassigned
      const order = allOrders.find(o => o._id === jumpId);

      if (order && isUnassignedOrder(order)) {
        // Use timeout to ensure DOM is ready
        setTimeout(() => {
          const el = orderRefs.current[jumpId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedOrderId(jumpId);
            setHighlightedOrderId(jumpId);

            // Try to find the select and focus it
            const select = el.querySelector('select');
            if (select) select.focus();

            // Remove highlight after 2.5s
            setTimeout(() => setHighlightedOrderId(null), 2500);
          }
        }, 300);
      }
    }
  }, [searchParams, loading, allOrders]);

  // Filter unassigned orders for left panel
  const unassignedOrders = useMemo(() => {
    return allOrders.filter(isUnassignedOrder);
  }, [allOrders]);

  // Calculate dynamic stats for an employee
  const getEmployeeStats = (empId) => {
    const empOrders = allOrders.filter(o =>
      (o.assignedAccountEmployee === empId) ||
      (o.assignedAccountEmployee?._id === empId) ||
      (o.accountsEmployee === empId)
    );

    const total = empOrders.length;
    const completed = empOrders.filter(o => o.status === 'Completed').length;
    const pending = total - completed;

    return { total, completed, pending };
  };

  const handleAssign = async (orderId, employeeId) => {
    try {
      const token = localStorage.getItem('token');
      const emp = employees.find(e => e._id === employeeId);
      const order = unassignedOrders.find(o => o._id === orderId);

      // Optimistically optionally select the employee in the right panel
      if (employeeId) setSelectedEmployeeId(employeeId);

      // Call API
      await assignOrder(orderId, employeeId);

      // Success
      setToast({ message: `Order Assigned to ${emp?.name || 'employee'}`, type: 'success' });

      // Update local state for immediate UI reflection without refetch
      setAllOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          return { ...o, assignedAccountEmployee: employeeId }; // Mark as assigned recursively
        }
        return o;
      }));

      // Clear toast after 3s
      setTimeout(() => setToast(null), 3000);

    } catch (e) {
      console.error(e);
      alert('Error assigning order: ' + (e.response?.data?.message || e.message));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex text-slate-800 font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">

        {/* Minimal Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Teams</h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-140px)]">

          {/* Left Panel: Unassigned Orders (70%) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 text-sm">
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden relative">
              <div className="px-8 py-6 border-b border-slate-50 bg-white z-10 sticky top-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Unassigned Orders</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Orders waiting to be assigned</p>
                  </div>
                  {unassignedOrders.length > 0 && (
                    <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {unassignedOrders.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30">
                {loading ? (
                  <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading orders...</div>
                ) : unassignedOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-slate-700 font-semibold">All cleared!</h3>
                    <p className="text-slate-400 text-xs mt-1">No unassigned orders found.</p>
                  </div>
                ) : (
                  unassignedOrders.map(order => (
                    <OrderCard
                      key={order._id}
                      domRef={el => orderRefs.current[order._id] = el}
                      order={order}
                      employees={employees}
                      onAssign={handleAssign}
                      isExpanded={expandedOrderId === order._id}
                      onToggle={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                      selectedEmployeeId={selectedEmployeeId}
                      isHighlighted={highlightedOrderId === order._id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Accounts Team (30%) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 text-sm">
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
              <div className="px-6 py-6 border-b border-slate-50">
                <h2 className="text-lg font-bold text-slate-800">Accounts Team</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage your team members</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/20">
                <div className="flex flex-col gap-2">
                  {employees.map(emp => {
                    const stats = getEmployeeStats(emp._id);
                    return (
                      <EmployeeCard
                        key={emp._id}
                        employee={emp}
                        stats={stats}
                        isSelected={selectedEmployeeId === emp._id}
                        onClick={() => setSelectedEmployeeId(selectedEmployeeId === emp._id ? null : emp._id)}
                      />
                    );
                  })}

                  {employees.length === 0 && !loading && (
                    <div className="text-center p-6 text-slate-400 text-xs">No team members found.</div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white border-t border-slate-50 text-[10px] text-slate-300 text-center">
                Team Overview
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-bounce-in">
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <span className="bg-green-500 rounded-full p-0.5">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </span>
            <p className="text-xs font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsTeamManage;
