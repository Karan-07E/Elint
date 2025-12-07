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

        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left: Unassigned Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[calc(100vh-150px)]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Unassigned Orders</h2>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {orders.length} orders
                </span>
              </div>

              <div className="flex-1 overflow-hidden">
                {/* List view */}
                {!selectedOrder && (
                  <div className="h-full overflow-y-auto bg-slate-50/60 border-t border-slate-100">
                    {orders.length === 0 ? (
                      <div className="p-6 text-xs text-slate-400 text-center">
                        No unassigned orders.
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
                            <li key={order._id}>
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="w-full text-left px-4 py-3 flex flex-col gap-1 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-semibold text-slate-700 truncate">
                                    {firstItemName}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {deadline ? deadline.toLocaleDateString() : '-'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                  PO: {order.poNumber || 'N/A'}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {customer}
                                </p>
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
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-sky-600 transition-transform transform hover:-translate-y-0.5"
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
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Accounts Employees */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col max-h-[calc(100vh-150px)]">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Accounts Employees</h2>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {employees.length} employees
                </span>
              </div>

              <div className="flex-1 flex divide-x divide-slate-200 overflow-hidden">
                {/* Employee list */}
                <div className="w-2/5 min-w-[220px] overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="p-6 text-xs text-slate-400 text-center">
                      No accounts employees found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {employees.map((emp) => {
                        const isSelected = selectedEmployee && selectedEmployee._id === emp._id;
                        return (
                          <li key={emp._id}>
                            <button
                              type="button"
                              onClick={() => setSelectedEmployee(emp)}
                              className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                                isSelected ? 'bg-green-50 border-l-2 border-green-500' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-[11px] font-semibold text-green-700">
                                  {emp.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{emp.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{emp.email}</p>
                                </div>
                              </div>
                              {emp.employeeId && (
                                <p className="text-[10px] text-slate-400 mt-0.5">ID: {emp.employeeId}</p>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Employee details */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  {selectedEmployee ? (
                    <div className="space-y-4">
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
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Select an employee to see details.
                    </div>
                  )}
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
