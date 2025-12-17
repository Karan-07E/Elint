import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getMyOrders } from '../services/api';
import { FaBoxOpen, FaClock, FaExclamationTriangle, FaCheckCircle, FaChevronDown, FaChevronRight } from 'react-icons/fa';

function EmployeeOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});

  // Fetch orders on mount
  useEffect(() => {
    fetchMyOrders();
  }, []);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const response = await getMyOrders();
      setOrders(response.data.orders || []);
      setError('');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load your orders: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for the 4 stages
  const getStats = () => {
    const stats = {
      assigned: 0,
      inProgress: 0,
      highPriority: 0,
      completed: 0
    };

    orders.forEach(order => {
      // Assigned Orders: All orders
      stats.assigned++;

      // In Progress: Orders that have status other than 'New' and 'Completed'
      if (order.status !== 'New' && order.status !== 'Completed') {
        stats.inProgress++;
      }

      // High Priority
      if (order.priority === 'High' || order.priority === 'Urgent') {
        stats.highPriority++;
      }

      // Completed
      if (order.status === 'Completed') {
        stats.completed++;
      }
    });

    return stats;
  };

  const stats = getStats();

  // Define the 4 stages
  const stages = [
    { 
      key: 'assigned', 
      label: 'Assigned Orders', 
      icon: <FaBoxOpen />, 
      color: 'bg-blue-100 text-blue-600', 
      border: 'border-blue-200',
      count: stats.assigned
    },
    { 
      key: 'inProgress', 
      label: 'In Progress', 
      icon: <FaClock />, 
      color: 'bg-orange-100 text-orange-600', 
      border: 'border-orange-200',
      count: stats.inProgress
    },
    { 
      key: 'highPriority', 
      label: 'High Priority', 
      icon: <FaExclamationTriangle />, 
      color: 'bg-red-100 text-red-600', 
      border: 'border-red-200',
      count: stats.highPriority
    },
    { 
      key: 'completed', 
      label: 'Completed Orders', 
      icon: <FaCheckCircle />, 
      color: 'bg-green-100 text-green-600', 
      border: 'border-green-200',
      count: stats.completed
    }
  ];

  // Filter orders based on selected stage
  const getFilteredOrders = () => {
    if (!selectedStage) return orders;

    switch (selectedStage) {
      case 'assigned':
        return orders;
      case 'inProgress':
        return orders.filter(o => o.status !== 'New' && o.status !== 'Completed');
      case 'highPriority':
        return orders.filter(o => o.priority === 'High' || o.priority === 'Urgent');
      case 'completed':
        return orders.filter(o => o.status === 'Completed');
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();

  const toggleOrder = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'bg-green-100 text-green-800',
      'Normal': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors['Normal'];
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800',
      'Verified': 'bg-indigo-100 text-indigo-800',
      'Manufacturing': 'bg-orange-100 text-orange-800',
      'Quality_Check': 'bg-purple-100 text-purple-800',
      'Documentation': 'bg-yellow-100 text-yellow-800',
      'Dispatch': 'bg-green-100 text-green-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || colors['New'];
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">My Orders</h1>
          <p className="text-sm text-slate-500">Track and manage your assigned order items</p>
        </div>

        {/* 4 Stages */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stages.map((stage) => {
            const isSelected = selectedStage === stage.key;
            return (
              <div key={stage.key} className="relative group">
                <div 
                  onClick={() => setSelectedStage(isSelected ? null : stage.key)} 
                  className={`
                    p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-200
                    flex flex-col items-center justify-center h-32
                    ${stage.color} 
                    ${isSelected ? 'ring-4 ring-offset-2 ring-blue-300 scale-105 z-10' : 'hover:-translate-y-1'}
                    ${stage.border}
                  `}
                >
                  <div className="text-2xl mb-2">{stage.icon}</div>
                  <div className="text-xs font-bold uppercase tracking-wider text-center">{stage.label}</div>
                  <div className="text-2xl font-bold mt-1">{stage.count}</div>
                  {isSelected && <div className="absolute top-2 right-2 text-xs bg-white bg-opacity-30 rounded-full px-2 py-0.5">Selected</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {selectedStage 
                    ? stages.find(s => s.key === selectedStage)?.label 
                    : 'All Assigned Orders'}
                </h2>
                <p className="text-sm text-slate-500">
                  Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                </p>
              </div>
              {selectedStage && (
                <button 
                  onClick={() => setSelectedStage(null)}
                  className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg">
                {error}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No orders found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md">
                    <div 
                      onClick={() => toggleOrder(order.id)}
                      className="bg-white p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs transition-transform duration-200" 
                          style={{ transform: expandedOrders[order.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                          <FaChevronRight />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-slate-700">PO #{order.po_number}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{order.customer_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Deadline</div>
                          <div className={`text-sm font-semibold ${order.overdue ? 'text-red-600' : 'text-gray-700'}`}>
                            {formatDate(order.deadline)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Items</div>
                          <div className="text-lg font-bold text-blue-600">{order.items?.length || 0}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Order Items */}
                    {expandedOrders[order.id] && (
                      <div className="bg-slate-50 p-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned Items</h4>
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <span className="bg-gray-200 px-2 py-1 rounded font-mono text-xs">
                                      {item.itemCode || item.item?.code || 'N/A'}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {item.itemName || item.item?.name || 'Unknown Item'}
                                    </span>
                                    <span className="bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-700">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  {item.completed && (
                                    <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                      <FaCheckCircle />
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No items assigned</p>
                        )}
                        
                        {/* Work on Order Button */}
                        <div className="mt-4">
                          <button
                            onClick={() => navigate(`/items`)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                          >
                            Start Working on this Order
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeOrders;
