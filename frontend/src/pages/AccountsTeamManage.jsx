import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders } from '../services/api';

// Helper utilities reused from other pages
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

// Best-effort guess for whether an order is unassigned from accounts side
const isUnassignedOrder = (order) => {
  return !(
    order.assignedAccountEmployee ||
    order.accountsEmployee ||
    order.assignedTo ||
    (order.assignee && (order.assignee._id || order.assignee.id))
  );
};

const getStatusBadgeClasses = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-700';
    case 'Dispatch':
      return 'bg-blue-100 text-blue-700';
    case 'Manufacturing':
      return 'bg-orange-100 text-orange-700';
    case 'Verified':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getRoleBadgeColor = (role) => {
  switch (role) {
    case 'accounts employee':
      return 'bg-green-50 text-green-700';
    case 'accounts team':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const AccountsTeamManage = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Auto-select first employee when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  // Auto-select first employee when employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('token');

        const [ordersRes, usersRes] = await Promise.all([
          getAllOrders(),
          fetch('/api/users', {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }),
        ]);

        const rawOrders = ordersRes.data || [];
        const unassigned = rawOrders.filter(isUnassignedOrder);
        setOrders(unassigned);
        // Don't pre-select any order so the details panel stays empty until user clicks
        setSelectedOrder(null);

        const usersJson = usersRes.ok ? await usersRes.json() : [];
        const accountsEmps = (usersJson || []).filter((u) => u.role === 'accounts employee');
        setEmployees(accountsEmps);
        setSelectedEmployee(accountsEmps[0] || null);

        setError(null);
      } catch (err) {
        console.error('Failed to load manage teams data', err);
        setError('Failed to load teams data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manage Teams</h1>
          </div>
          {currentUser?.name && (
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{currentUser.name}</p>
              <p className="capitalize">{currentUser.role}</p>
            </div>
          )}
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 h-[calc(100vh-180px)]">
            {/* Left: Unassigned Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-50">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Unassigned Orders</h2>
                    <p className="text-xs text-slate-500">Orders waiting to be assigned</p>
                  </div>
                </div>
                <span className="text-sm px-3 py-1.5 rounded-full bg-white text-blue-700 font-medium border border-blue-100 shadow-sm">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* List view */}
                {!selectedOrder && (
                  <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
                    {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h3 className="text-base font-medium text-slate-700 mb-1">No unassigned orders</h3>
                        <p className="text-sm text-slate-500 max-w-xs">All orders have been assigned to team members.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {orders.map((order) => {
                          const { deadline } = computeOrderDates(order);
                          const customer = order.customerName || order.party?.name || 'Customer';
                          const firstItemName = Array.isArray(order.items) && order.items.length > 0
                            ? (order.items[0].itemName || order.items[0].name || 'Item')
                            : 'Item';

                          return (
                            <li key={order._id} className="border-b border-slate-100 last:border-0">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="w-full text-left px-5 py-3.5 flex flex-col gap-1.5 hover:bg-blue-50/50 transition-all duration-150 group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">
                                      {firstItemName}
                                    </p>
                                    <div className="flex items-center mt-1 space-x-2">
                                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        PO: {order.poNumber || 'N/A'}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {customer}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end ml-2">
                                    <span className="text-xs font-medium text-slate-500">
                                      {deadline ? deadline.toLocaleDateString() : '-'}
                                    </span>
                                    {deadline && new Date(deadline) < new Date() && (
                                      <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full mt-1">
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Detail view */}
                {selectedOrder && (
                  <div className="h-full overflow-y-auto p-4 bg-slate-50">
                    <div className="space-y-4">
                      {/* Header with back arrow, PO and status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(null)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/0 text-blue-600 shadow-sm hover:shadow-md hover:bg-blue-50/50 transition-transform transform hover:-translate-y-0.5 border border-blue-100"
                            title="Back to orders"
                          >
                            <span className="text-lg leading-none">←</span>
                          </button>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              PO: {selectedOrder.poNumber || 'N/A'}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {selectedOrder.customerName || selectedOrder.party?.name || 'Customer'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${getStatusBadgeClasses(selectedOrder.status)}`}>
                          {selectedOrder.status || 'New'}
                        </span>
                      </div>

                      {loading ? (
                        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                          <div className="text-slate-400">Loading team data...</div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3 text-[11px] text-slate-600">
                            {(() => {
                              const { start, deadline } = computeOrderDates(selectedOrder);
                              return (
                                <>
                                  <div className="flex justify-between gap-6">
                                    <div>
                                      <p className="text-[10px] uppercase text-slate-400">Start</p>
                                      <p className="font-medium">{start ? start.toLocaleDateString() : '-'}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] uppercase text-slate-400">Deadline</p>
                                      <p className="font-medium">{deadline ? deadline.toLocaleDateString() : '-'}</p>
                                    </div>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <div>
                                      <p className="text-[10px] uppercase text-slate-400">Priority</p>
                                      <p className="font-medium">
                                        {selectedOrder.priority || 'Normal'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] uppercase text-slate-400">Amount</p>
                                      <p className="font-semibold text-slate-800">
                                        ₹{(selectedOrder.totalAmount || 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                            <table className="w-full text-[11px]">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                                  <th className="px-3 py-2 text-left font-semibold">Delivery</th>
                                  <th className="px-3 py-2 text-left font-semibold">Qty</th>
                                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                                  selectedOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 text-slate-700">
                                        {item.itemName || item.name}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">
                                        {formatDate(item.deliveryDate)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">
                                        {item.quantity} {item.unit}
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-700">
                                        ₹{item.amount}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                                      No items.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedOrder.notes && (
                            <div className="bg-white rounded-md border border-slate-200 p-3 text-[11px] text-slate-600">
                              <p className="text-[10px] uppercase text-slate-400 mb-1">Notes</p>
                              <p>{selectedOrder.notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Accounts Employees */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-md">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-green-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Accounts Team</h2>
                    <p className="text-xs text-slate-500">Manage your team members</p>
                  </div>
                </div>
                <span className="text-sm px-3 py-1.5 rounded-full bg-white text-green-700 font-medium border border-green-100 shadow-sm">
                  {employees.length} {employees.length === 1 ? 'member' : 'members'}
                </span>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {/* Employee list */}
                <div className="flex-1 overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-base font-medium text-slate-700 mb-1">No team members</h3>
                      <p className="text-sm text-slate-500 max-w-xs">Add team members to get started with order assignments.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {employees.map((emp) => (
                        <li 
                          key={emp._id}
                          className={`p-4 border-b border-slate-100 last:border-0 transition-colors duration-150 ${
                            selectedEmployee?._id === emp._id ? 'bg-green-50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 relative">
                              <div className={`h-11 w-11 rounded-full ${
                                selectedEmployee?._id === emp._id ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'
                              } flex items-center justify-center text-lg font-medium`}>
                                {emp.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              {emp.isOnline && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                                {emp.assignedOrdersCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {emp.assignedOrdersCount} {emp.assignedOrdersCount === 1 ? 'order' : 'orders'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                              {emp.lastActive && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Last active: {new Date(emp.lastActive).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Employee details */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {selectedEmployee ? (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                              {selectedEmployee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-800">{selectedEmployee.name}</h3>
                              <p className="text-xs text-slate-500">{selectedEmployee.email}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getRoleBadgeColor(selectedEmployee.role)}`}>
                            {selectedEmployee.role}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                          {selectedEmployee.employeeId && (
                            <div>
                              <p className="text-[10px] uppercase text-slate-400">Employee ID</p>
                              <p className="font-medium">{selectedEmployee.employeeId}</p>
                            </div>
                          )}
                          {selectedEmployee.teamLeaderId && (
                            <div>
                              <p className="text-[10px] uppercase text-slate-400">Team Leader</p>
                              <p className="font-medium">{selectedEmployee.teamLeaderId.name}</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-md border border-slate-200 p-3 text-[11px] text-slate-600">
                          <p className="text-[10px] uppercase text-slate-400 mb-1">Role & Access</p>
                          <p>
                            This is a read-only summary of the employee. Permissions and detailed access
                            rules can be managed from the admin Manage Teams panel.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsTeamManage;
