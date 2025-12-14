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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
        </header>

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
