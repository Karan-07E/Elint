import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getMyOrders } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function EmployeeProgress() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    completed: 0,
    incomplete: 0,
    total: 0
  });

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await getMyOrders();
      const ordersData = response.data.orders || [];
      setOrders(ordersData);

      // Calculate statistics
      const completed = ordersData.filter(order => 
        order.items.every(item => item.completed === true)
      ).length;
      const incomplete = ordersData.length - completed;

      setStats({
        completed,
        incomplete,
        total: ordersData.length
      });

      setError('');
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError('Failed to load progress data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Completed', value: stats.completed, color: '#10b981' },
    { name: 'Incomplete', value: stats.incomplete, color: '#f59e0b' }
  ];

  const COLORS = {
    'Completed': '#10b981',
    'Incomplete': '#f59e0b'
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent === 0) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <header className="bg-white shadow-sm border-b border-gray-100 px-8 py-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
            <p className="text-sm text-gray-500 mt-1">Track your order completion progress</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-4">Loading your progress...</p>
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
          ) : stats.total === 0 ? (
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
          ) : (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <div className="bg-blue-100 rounded-full p-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Completed</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
                    </div>
                    <div className="bg-green-100 rounded-full p-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Incomplete</p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">{stats.incomplete}</p>
                    </div>
                    <div className="bg-amber-100 rounded-full p-4">
                      <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie Chart Section */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Completion Overview</h2>
                
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry) => (
                          <span className="font-medium text-gray-700">
                            {value}: {entry.payload.value} orders
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Completion Percentage */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500 font-medium">Overall Completion Rate</p>
                    <p className="text-4xl font-bold text-blue-600 mt-2">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Orders</h2>
                <div className="space-y-3">
                  {orders.map((order) => {
                    const isCompleted = order.items.every(item => item.completed === true);
                    const completedItems = order.items.filter(item => item.completed === true).length;
                    const totalItems = order.items.length;

                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                          <div>
                            <p className="font-semibold text-gray-900">Order #{order.po_number}</p>
                            <p className="text-sm text-gray-500">{order.customer_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">
                              {completedItems} / {totalItems} items completed
                            </p>
                            <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${(completedItems / totalItems) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            isCompleted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default EmployeeProgress;
