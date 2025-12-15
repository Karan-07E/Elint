import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders, assignOrder, updateOrder } from '../services/api';
import {
  LuCalendar,
  LuClock,
  LuCircleCheck,
  LuShoppingBag,
  LuArrowRight,
  LuLayoutDashboard,
  LuUsers,
  LuChevronRight,
  LuSearch
} from "react-icons/lu";

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

// --- Helpers ---

const getNextJobNumber = (existingJobNumbers) => {
  let maxSeq = 0;
  existingJobNumbers.forEach(jobNo => {
    if (jobNo && jobNo.toUpperCase().startsWith('EJB-')) {
      const parts = jobNo.split('-');
      if (parts.length === 2) {
        const seq = parseInt(parts[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  const nextSeq = maxSeq + 1;
  return `EJB-${String(nextSeq).padStart(5, '0')}`;
};

// --- Components ---

const PriorityChip = ({ priority }) => {
  const p = (priority || 'Normal').toLowerCase();

  const styles = {
    high: "bg-red-50 text-red-600 border-red-100 ring-red-500/10",
    medium: "bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10",
    low: "bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10",
    normal: "bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/10"
  };

  const activeStyle = styles[p] || styles.normal;

  return (
    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ring-1 ring-inset ${activeStyle} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
      {priority || 'Normal'}
    </span>
  );
};

const OrderCard = ({ order, employees, onAssign, isExpanded, onToggle, selectedEmployeeId, domRef, isHighlighted, existingJobNumbers }) => {
  const [assigneeId, setAssigneeId] = useState(selectedEmployeeId || '');
  const [jobNumber, setJobNumber] = useState(''); // Map Job Number to poNumber - Start empty as requested
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedEmployeeId) setAssigneeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const { start, deadline } = computeOrderDates(order);
  const customer = order.customerName || order.party?.name || 'Customer';
  const derivedPriority = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal');
  const totalAmount = order.totalAmount || 0;
  const itemCount = (order.items || []).length;

  const handleAssign = () => {
    setError('');

    // Validation
    if (!assigneeId) return setError('Please select an employee.');

    // Auto-generate if empty (optional safety) or validate strict format if manual
    let finalJobNumber = jobNumber.trim();
    if (!finalJobNumber) return setError('Job Number is required. Click Generate.');

    // Regex validation for EJB-xxxxx
    if (!/^EJB-\d{5}$/i.test(finalJobNumber)) {
      return setError('Job Number must be in format EJB-00001');
    }

    // Uniqueness Check (Client-side against loaded orders)
    // We exclude the current order's own PO number from the check
    if (existingJobNumbers.has(jobNumber.trim().toLowerCase()) && jobNumber.trim().toLowerCase() !== (order.poNumber || '').toLowerCase()) {
      return setError('Job Number already exists.');
    }

    setIsExiting(true);
    setTimeout(() => {
      onAssign(order._id, assigneeId, jobNumber.trim());
    }, 400);
  };

  if (isExiting) {
    return (
      <div className="transition-all duration-500 ease-in-out transform -translate-y-4 opacity-0 h-0 overflow-hidden mb-0" />
    );
  }

  return (
    <div
      ref={domRef}
      className={`
        bg-white rounded-[20px] transition-all duration-300 mb-5 overflow-hidden group
        ${isExpanded ? 'shadow-xl shadow-blue-900/5 ring-1 ring-blue-50' : 'shadow-sm hover:shadow-md border border-slate-100'} 
        ${isHighlighted ? 'ring-2 ring-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]' : ''}
      `}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        className={`p-5 cursor-pointer flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/30'}`}
      >
        <div className="flex items-center gap-5">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm
            ${isExpanded ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white border border-slate-100 text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500'}
            transition-all duration-300
          `}>
            <LuShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-slate-800 text-base">{order.poNumber || 'No Job #'}</h3>
              {isExpanded && <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">{customer}</span>}
            </div>
            {!isExpanded && <p className="text-xs text-slate-500 font-medium">{customer}</p>}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1.5 justify-end text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
              <LuClock size={10} />
              <span>Deadline</span>
            </div>
            <p className={`text-xs font-semibold ${deadline && new Date(deadline) < new Date() ? 'text-red-500' : 'text-slate-700'}`}>
              {formatDate(deadline)}
            </p>
          </div>

          <PriorityChip priority={derivedPriority} />

          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-blue-100/50 text-blue-600 rotate-90' : 'text-slate-300 group-hover:text-slate-500'}`}>
            <LuChevronRight size={18} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100">

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Details */}
            <div className="flex-1 space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Items Ref</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{itemCount} items ordered</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Value</p>
                  <p className="text-sm font-bold text-slate-800">₹{totalAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Delivery</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(order.items || []).map((item, i) => (
                      <tr key={i} className="group/row hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{item.itemName || item.name}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(item.deliveryDate)}</td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono bg-slate-50/50 group-hover/row:bg-transparent transition-colors">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono">{item.amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium tracking-wide">
                  <span>START: {formatDate(start)}</span>
                  <span>TOTAL: ₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Right: Action */}
            <div className="w-full lg:w-72 flex flex-col justify-end">
              <div className="bg-white p-5 rounded-[20px] border border-blue-100 shadow-lg shadow-blue-500/5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-green-400"></div>

                {/* Job Number Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span>Job Number (PO #) <span className="text-red-500">*</span></span>
                    <button
                      onClick={() => {
                        const next = getNextJobNumber(existingJobNumbers);
                        setJobNumber(next);
                        setError('');
                      }}
                      className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                    >
                      Generate Next
                    </button>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder="EJB-00001"
                    value={jobNumber}
                    onChange={(e) => setJobNumber(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 text-right">Format: EJB-00001</p>
                </div>

                {/* Assignee Select */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Assign To <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border-0 ring-1 ring-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all appearance-none cursor-pointer"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    >
                      <option value="">Select Employee...</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <LuChevronRight className="rotate-90 w-4 h-4" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-500 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAssign}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none transition-all duration-200 flex items-center justify-center gap-2 group/btn"
                >
                  <span>Confirm Assignment</span>
                  <LuArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const EmployeeCard = ({ employee, stats, isSelected, onClick }) => {
  const status = stats.pending > 0 ? 'Busy' : 'Available';
  const isBusy = status === 'Busy';
  const loadPercentage = Math.min((stats.pending / 5) * 100, 100); // Assume 5 is max load for visual

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-[20px] border cursor-pointer transition-all duration-300 group overflow-hidden
        ${isSelected
          ? 'bg-blue-50/50 border-blue-200 shadow-md ring-1 ring-blue-100'
          : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-md'
        }
      `}
    >
      {/* Background Progress Bar for Load */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 transition-all duration-1000"
        style={{ width: `${loadPercentage}%` }}
      />

      <div className="flex items-center gap-4 relative z-10">
        <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-inner transition-colors duration-300
          ${isSelected ? 'bg-white text-blue-600 shadow-blue-100' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500'}
        `}>
          {employee.name?.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
              {employee.name}
            </h4>
            <span className={`
              text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border
              ${isBusy
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'}
            `}>
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate font-medium">{employee.email}</p>
        </div>
      </div>

      {/* Expanded Stats - Only visible when selected */}
      <div className={`
        mt-4 pt-4 border-t border-slate-100/50 transition-all duration-300
        ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale fixed hidden'}
      `}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/60 p-2.5 rounded-xl border border-slate-50">
            <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Active</p>
            <p className="text-sm font-bold text-slate-700">{stats.pending}</p>
          </div>
          <div className="bg-white/60 p-2.5 rounded-xl border border-slate-50">
            <p className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">Completed</p>
            <p className="text-sm font-bold text-emerald-600">{stats.completed}</p>
          </div>
        </div>

        {/* Assigned Orders List */}
        {stats.activeOrders && stats.activeOrders.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase text-slate-400 font-bold">Current Assignments</p>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {stats.activeOrders.map(o => (
                <div key={o._id} className="text-xs bg-slate-50/80 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span className="font-medium text-slate-600">{o.poNumber || 'PO-####'}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{o.status || 'Pending'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Page ---

const AccountsTeamManage = () => {
  // Same logic as before, just styled container
  const [searchParams] = useSearchParams();
  const orderRefs = useRef({});
  const [searchQuery, setSearchQuery] = useState('');

  const [allOrders, setAllOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Fetch Orders
      const ordersRes = await getAllOrders();
      // Fetch Employees
      let employeesData = [];
      if (token) {
        try {
          const usersRes = await fetch('/api/users/team/employees', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (usersRes.ok) employeesData = await usersRes.json();
        } catch (e) { console.error(e); }
      }

      setAllOrders(ordersRes.data || []);
      const accountsEmps = (employeesData || []).filter((u) => u.role === 'employee');
      setEmployees(accountsEmps);
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Filter unassigned
  const unassignedOrders = useMemo(() => {
    const unassigned = allOrders.filter(isUnassignedOrder);
    if (!searchQuery) return unassigned;
    const q = searchQuery.toLowerCase();
    return unassigned.filter(o =>
      (o.poNumber || '').toLowerCase().includes(q) ||
      (o.customerName || o.party?.name || '').toLowerCase().includes(q)
    );
  }, [allOrders, searchQuery]);

  // Handle Deep Linking
  useEffect(() => {
    const jumpId = searchParams.get('orderId');
    if (jumpId && !loading && allOrders.length > 0) {
      // Find if this order is strictly unassigned
      const target = unassignedOrders.find(o => o._id === jumpId);
      if (target) {
        setHighlightedOrderId(jumpId);
        setExpandedOrderId(jumpId);
        // Scroll to it
        setTimeout(() => {
          if (orderRefs.current[jumpId]) {
            orderRefs.current[jumpId].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [searchParams, loading, allOrders, unassignedOrders]);

  const getEmployeeStats = (empId) => {
    const empOrders = allOrders.filter(o =>
      (o.assignedAccountEmployee === empId) ||
      (o.assignedAccountEmployee?._id === empId) ||
      (o.accountsEmployee === empId)
    );
    const completed = empOrders.filter(o => o.status === 'Completed').length;
    const active = empOrders.filter(o => o.status !== 'Completed');
    return {
      total: empOrders.length,
      completed,
      pending: active.length,
      activeOrders: active
    };
  };

  // Create a Set of existing Job Numbers (poNumbers) for quick lookup
  const existingJobNumbers = useMemo(() => {
    const set = new Set();
    allOrders.forEach(o => {
      if (o.poNumber) set.add(o.poNumber.trim().toLowerCase());
    });
    return set;
  }, [allOrders]);

  const handleAssign = async (orderId, employeeId, jobNumber) => {
    try {
      const emp = employees.find(e => e._id === employeeId);
      if (employeeId) setSelectedEmployeeId(employeeId);

      // 1. Update Job Number (PO Number) First
      // We assume simple success if no error thrown.
      await updateOrder(orderId, { poNumber: jobNumber });

      // 2. Assign Order
      await assignOrder(orderId, employeeId);

      setToast({ message: `Assigned Job ${jobNumber} to ${emp?.name || 'Employee'}`, type: 'success' });

      // Update local state to reflect changes immediately
      setAllOrders(prev => prev.map(o => o._id === orderId ? { ...o, assignedAccountEmployee: employeeId, poNumber: jobNumber } : o));

      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen ml-64 overflow-hidden relative">
        {/* Top Gradient Accent */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="px-10 py-8 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 mb-1">
              Team Workflow
            </h1>
            <p className="text-sm text-slate-400 font-medium">Assign orders and manage workload</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-sm text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {employees.length} Team Members
            </div>
            <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-sm text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {unassignedOrders.length} Pending
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 px-10 pb-10 overflow-hidden">
          <div className="grid grid-cols-12 gap-8 h-full">

            {/* Left Panel: Unassigned Orders */}
            <div className="col-span-8 flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-[32px] border border-white shadow-xl shadow-slate-200/50 overflow-hidden relative">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 sticky top-0 z-20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <LuLayoutDashboard />
                  </div>
                  <h2 className="font-bold text-slate-800">Unassigned Orders</h2>
                </div>

                {/* Search / Filter placeholder */}
                <div className="relative">
                  <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Filter PO..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all w-48 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">Loading...</div>
                ) : unassignedOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                      <LuCircleCheck className="w-8 h-8" />
                    </div>
                    <p className="font-medium text-slate-500">All caught up!</p>
                    <p className="text-xs text-slate-400">No unassigned orders available.</p>
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
                      existingJobNumbers={existingJobNumbers}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Team */}
            <div className="col-span-4 flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-[32px] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="px-6 py-6 border-b border-slate-100 bg-white/50 sticky top-0 z-20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <LuUsers />
                  </div>
                  <h2 className="font-bold text-slate-800">Accounts Team</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/30">
                {employees.map(emp => (
                  <EmployeeCard
                    key={emp._id}
                    employee={emp}
                    stats={getEmployeeStats(emp._id)}
                    isSelected={selectedEmployeeId === emp._id}
                    onClick={() => setSelectedEmployeeId(selectedEmployeeId === emp._id ? null : emp._id)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-10 right-10 z-50 animate-bounce-in">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/50">
              <div className="bg-green-500 rounded-full p-1">
                <LuCircleCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">{toast.message}</p>
                <p className="text-[10px] text-slate-400">Successfully updated.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountsTeamManage;
