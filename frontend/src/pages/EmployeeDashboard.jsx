import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getMyOrders } from '../services/api';
import axios from 'axios';

function EmployeeDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const response = await getMyOrders();
      console.log('API Response:', response.data);
      console.log('Orders received:', response.data.orders);
      setOrders(response.data.orders || []);
      setError('');
    } catch (err) {
      console.error('Error fetching orders:', err);
      console.error('Error response:', err.response?.data);
      setError('Failed to load your orders: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleItemCheckbox = async (orderId, itemIndex, currentCompleted) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/orders/${orderId}/item-completion`,
        { itemIndex, completed: !currentCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = [...order.items];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], completed: !currentCompleted };
          return { ...order, items: updatedItems };
        }
        return order;
      }));
    } catch (err) {
      console.error('Error updating item completion:', err);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800',
      'Normal': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'On Hold': 'bg-orange-100 text-orange-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

<<<<<<< HEAD
    const scrollToOrder = (id) => {
        const el = scrollRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Temporary highlight logic could go here (e.g. state based class)
            el.classList.add('ring-4', 'ring-blue-200');
            setTimeout(() => el.classList.remove('ring-4', 'ring-blue-200'), 2000);
        }
    };

    // Helper Styles
    const getPriorityColor = (p) => {
        switch (p) {
            case 'High':
            case 'Urgent': return 'bg-orange-500 text-orange-600 border-orange-200 bg-orange-50';
            case 'Low': return 'bg-emerald-500 text-emerald-600 border-emerald-200 bg-emerald-50';
            case 'Normal':
            default: return 'bg-blue-500 text-blue-600 border-blue-200 bg-blue-50';
        }
    };

    const getPriorityStripe = (p) => {
        switch (p) {
            case 'High':
            case 'Urgent': return 'border-l-orange-500';
            case 'Low': return 'border-l-emerald-500';
            default: return 'border-l-blue-500';
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar />
            <div className="flex-1 ml-64 p-6 lg:p-10 flex gap-8">

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 flex flex-col gap-8">

                    {/* Hero Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Assigned</span>
                                <span className="text-4xl lg:text-5xl font-extrabold text-slate-800">{loading ? '...' : stats.total}</span>
                            </div>

                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center">
                                    <span className="text-red-500 font-bold text-xl">{stats.overdue}</span>
                                    <span className="text-red-400 text-[10px] uppercase font-bold">Overdue</span>
                                </div>
                                <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl flex flex-col items-center">
                                    <span className="text-orange-500 font-bold text-xl">{stats.highPriority}</span>
                                    <span className="text-orange-400 text-[10px] uppercase font-bold">High Pri</span>
                                </div>
                                <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center">
                                    <span className="text-blue-500 font-bold text-xl">{stats.pending}</span>
                                    <span className="text-blue-400 text-[10px] uppercase font-bold">In Prog</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Filter Chips */}
                        <div className="flex gap-2">
                            {[
                                { label: 'All', val: 'all' },
                                { label: 'Today', val: 'today' },
                                { label: 'Week', val: 'week' },
                                { label: '30 Days', val: 'last30' }
                            ].map(chip => (
                                <button
                                    key={chip.val}
                                    onClick={() => setRangeFilter(chip.val)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${rangeFilter === chip.val
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Orders Feed */}
                    <div className="flex flex-col gap-4">
                        {loading && orders.length === 0 ? (
                            // Skeleton Loader
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
                            ))
                        ) : orders.length === 0 ? (
                            // Empty State
                            <div className="bg-white rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm border border-slate-100">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <LuClipboardList className="text-slate-300 text-3xl" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">No assigned orders</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-xs">You currently have no orders assigned matching this filter. Contact your manager if this looks incorrect.</p>
                            </div>
                        ) : (
                            orders.map((order) => { const derivedPriority = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal'); return (
                                <div
                                    key={order.id}
                                    ref={el => scrollRefs.current[order.id] = el}
                                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 flex overflow-hidden border-l-[6px] ${getPriorityStripe(derivedPriority)}`}
                                >
                                    <div className="p-5 flex-1 flex flex-col gap-2">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-slate-800">{order.po_number || 'No PO'}</h3>
                                                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {order.customer_name}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
                                                    <span>{order.items?.length || 0} items</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span>{(order.amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                                </div>
                                            </div>

                                            {/* Deadline Badge */}
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${order.overdue
                                                ? 'bg-red-100 text-red-700 animate-pulse border border-red-200'
                                                : 'bg-slate-50 text-slate-600 border border-slate-100'
                                                }`}>
                                                {order.overdue && <LuCircleAlert size={14} />}
                                                {!order.overdue && <LuClock size={14} />}
                                                {new Date(order.deadline).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Card Attributes */}
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getPriorityColor(derivedPriority).split(' ').slice(1).join(' ')} ${getPriorityColor(derivedPriority).split(' ')[0]}`}>
                                                {derivedPriority}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border bg-slate-50 border-slate-200 text-slate-500">
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions Col */}
                                    <div className="border-l border-slate-50 bg-slate-50/50 p-4 flex flex-col justify-center gap-2 w-32">
                                        <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-blue-200">
                                            View Details
                                        </button>
                                        {order.status !== 'Completed' && (
                                            <button
                                                onClick={() => handleStatusUpdate(order.id, 'Completed')}
                                                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ); })
                        )}
                    </div>

                </div>

                {/* Right Mini-Map (Hidden on mobile) */}
                <div className="hidden lg:block w-56 sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto pr-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <LuMousePointerClick /> Quick Jump
                    </h4>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 flex flex-col gap-1">
                        {orders.map(order => { const derivedPriority = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal'); return (
                            <button
                                key={order.id}
                                onClick={() => scrollToOrder(order.id)}
                                className="text-left w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group flex items-center justify-between"
                            >
                                <span className={`text-xs font-medium ${order.overdue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                    {order.po_number}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${derivedPriority === 'High' ? 'bg-orange-400' :
                                    derivedPriority === 'Urgent' ? 'bg-orange-500' :
                                        'bg-slate-200'
                                    }`} />
                            </button>
                        )})}
                        {orders.length === 0 && (
                            <span className="text-xs text-slate-400 px-3 py-2 italic">List empty</span>
                        )}
                    </div>
                </div>
=======
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
        </header>
>>>>>>> 1819e2b (orders beku testing ge)

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading orders...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No orders assigned to you yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-lg">
                  {/* Order Header */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Order #{order.po_number}</h2>
                        <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="p-6">
                    {/* Key Info Section */}
                    <div className="flex items-center gap-6 mb-6 text-sm">
                      <div>
                        <span className="text-gray-500">Assigned To:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {order.assignedTo ? order.assignedTo.name : 'Not assigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Deadline:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(order.deadline)}</span>
                      </div>
                    </div>

                    {/* Order Items Section */}
                    <div>
                      <div className="border border-gray-200 rounded overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-16"></th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rate</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={item.completed || false}
                                      onChange={() => handleItemCheckbox(order.id, idx, item.completed)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.item?.name || item.itemName || 'Unknown Item'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    ₹{item.rate?.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    ₹{item.amount?.toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-4 py-3 text-sm text-gray-500 text-center">
                                  No items assigned
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Total Amount */}
                      <div className="mt-4 flex justify-end">
                        <div className="text-sm">
                          <span className="text-gray-600">Total Amount: </span>
                          <span className="font-semibold text-gray-900">
                            ₹{order.amount?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
