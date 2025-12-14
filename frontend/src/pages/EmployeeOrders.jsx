import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getMyOrders } from '../services/api';
import axios from 'axios';

function EmployeeDashboard() {
  const [orders, setOrders] = useState([]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
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
    // Only allow checking, not unchecking
    if (currentCompleted) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/orders/${orderId}/item-completion`,
        { itemIndex, completed: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = [...order.items];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], completed: true };
          return { ...order, items: updatedItems };
        }
        return order;
      });
      setOrders(updatedOrders);
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

  const handleMoveNext = () => {
    if (currentOrderIndex < orders.length - 1) {
      setCurrentOrderIndex(currentOrderIndex + 1);
    }
  };

  const isAllOrdersCompleted = () => {
    return orders.every(order => 
      order.items.every(item => item.completed === true)
    );
  };

  const currentOrder = orders[currentOrderIndex];
  const isCurrentOrderCompleted = currentOrder?.items.every(item => item.completed === true);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="bg-white shadow-sm border-b border-gray-100 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
              <p className="text-sm text-gray-500 mt-1">Track and manage your assigned order items</p>
            </div>
            {orders.length > 0 && !isAllOrdersCompleted() && (
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-gray-600">Order </span>
                  <span className="text-lg font-bold text-blue-600">{currentOrderIndex + 1}</span>
                  <span className="text-sm text-gray-600"> of </span>
                  <span className="text-lg font-bold text-blue-600">{orders.length}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-4">Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="flex flex-col items-center">
                <div className="bg-blue-100 rounded-full p-6 mb-4">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h3>
                <p className="text-gray-500">You don't have any orders assigned to you at the moment.</p>
              </div>
            </div>
          ) : isAllOrdersCompleted() ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
              <div className="flex flex-col items-center">
                <div className="bg-green-100 rounded-full p-6 mb-4">
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">All Orders Completed!</h3>
                <p className="text-gray-500">Congratulations! You have completed all your assigned orders.</p>
              </div>
            </div>
          ) : currentOrder ? (
            <div className="space-y-6">
              {/* Current Order Card */}
              <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 px-8 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-blue-600">Order #{currentOrder.po_number}</span>
                      </h2>
                      <p className="text-sm text-gray-700 mt-1 font-medium">{currentOrder.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm ${getPriorityColor(currentOrder.priority)}`}>
                        {currentOrder.priority}
                      </span>
                      <span className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm ${getStatusColor(currentOrder.status)}`}>
                        {currentOrder.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-8">
                  {/* Key Info Section */}
                  <div className="flex items-center gap-8 mb-6">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div>
                        <span className="text-xs text-gray-500 block">Assigned To</span>
                        <span className="font-semibold text-gray-900">
                          {currentOrder.assignedTo 
                            ? `${currentOrder.assignedTo.name}${currentOrder.assignedTo.employeeId ? ` (${currentOrder.assignedTo.employeeId})` : ''}` 
                            : 'Not assigned'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-lg">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <span className="text-xs text-gray-500 block">Deadline</span>
                        <span className="font-semibold text-gray-900">{formatDate(currentOrder.deadline)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16"></th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Code</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Item Name</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentOrder.items && currentOrder.items.length > 0 ? (
                            currentOrder.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-blue-50 transition-colors duration-150">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={item.completed || false}
                                    onChange={() => handleItemCheckbox(currentOrder.id, idx, item.completed)}
                                    disabled={item.completed || false}
                                    className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all ${
                                      item.completed ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                                    }`}
                                  />
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  <span className="bg-gray-100 px-3 py-1 rounded font-mono text-xs">
                                    {item.item?.code || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  {item.item?.name || item.itemName || 'Unknown Item'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  <span className="bg-blue-50 px-3 py-1 rounded-full">{item.quantity} {item.unit}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="px-6 py-8 text-sm text-gray-500 text-center">
                                No items assigned
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Move Next Button */}
                    {isCurrentOrderCompleted && currentOrderIndex < orders.length - 1 && (
                      <div className="mt-6">
                        <button
                          onClick={handleMoveNext}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                        >
                          <span>Move Next</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
