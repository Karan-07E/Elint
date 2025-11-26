import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getDashboardSummary, getOrderChartData, getRecentTransactions } from '../services/api';
import Sidebar from '../components/Sidebar.jsx';
import { FaSpinner } from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();
  
  // State
  const [summary, setSummary] = useState({
    counts: { inQueue: 0, inProgress: 0, completed: 0 },
    queueList: [],
    progressList: []
  });
  const [chartData, setChartData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  // Logout Logic
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

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryRes, chartRes, txnRes] = await Promise.all([
          getDashboardSummary(),
          getOrderChartData(period),
          getRecentTransactions()
        ]);

        setSummary(summaryRes.data);
        setChartData(chartRes.data);
        setTransactions(txnRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [period]);

  const reports = [
    { name: 'Sale Report', icon: '📝', path: '/reports/sales' },
    { name: 'All Transactions', icon: '💳', path: '/reports/transactions' },
    { name: 'Daybook Report', icon: '📅', path: '/reports/daybook' },
    { name: 'Party Statement', icon: '👤', path: '/parties' }
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        
        {/* Top Header */}
        <header className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome to <span className="text-orange-500">Elints</span>
            </h1>
            <p className="text-sm text-slate-500">Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/orders/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              + Create Order
            </button>
            <button 
              onClick={handleLogout}
              className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            
            {/* Main Content Area */}
            <div className="flex flex-col gap-6 xl:col-span-2">
              
              {/* 1. Status Cards with Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Orders In Queue (New) */}
                <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-6xl">⏳</span>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">In Queue (New)</h3>
                      <div className="text-3xl font-bold text-slate-800 mt-1">{summary.counts.inQueue}</div>
                    </div>
                    <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">Pending</span>
                  </div>
                  
                  {/* Dropdown List */}
                  <div className="mt-2">
                    <label className="text-xs text-slate-400 font-medium mb-1 block">Recent New Orders</label>
                    <select className="w-full text-sm border-slate-200 rounded-md focus:ring-orange-500 focus:border-orange-500 bg-slate-50">
                      <option disabled selected>View Orders ({summary.queueList.length})</option>
                      {summary.queueList.map(order => (
                        <option key={order.id}>
                          {order.poNumber} - {order.customerName}
                        </option>
                      ))}
                      {summary.queueList.length === 0 && <option disabled>No new orders</option>}
                    </select>
                  </div>
                </div>

                {/* Orders In Progress */}
                <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-6xl">⚙️</span>
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">In Progress</h3>
                      <div className="text-3xl font-bold text-slate-800 mt-1">{summary.counts.inProgress}</div>
                    </div>
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">Active</span>
                  </div>

                  {/* Dropdown List */}
                  <div className="mt-2">
                    <label className="text-xs text-slate-400 font-medium mb-1 block">Active Orders</label>
                    <select className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-slate-50">
                      <option disabled selected>View Orders ({summary.progressList.length})</option>
                      {summary.progressList.map(order => (
                        <option key={order.id}>
                          {order.poNumber} - {order.status}
                        </option>
                      ))}
                      {summary.progressList.length === 0 && <option disabled>No active orders</option>}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Graph Section */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-700 font-bold">Order Trends</h3>
                  <select
                    className="border border-slate-200 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="inQueue" 
                        name="New / In Queue"
                        stroke="#f97316" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="inProgress" 
                        name="In Progress"
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="flex flex-col gap-6">
              
              {/* Quick Actions / Empty State */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-3xl">
                  🚀
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Quick Actions</h3>
                <p className="text-slate-500 text-sm mb-4">Manage your business efficiently.</p>
                <div className="w-full space-y-2">
                  <button onClick={() => navigate('/sale/new')} className="w-full py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Create Invoice</button>
                  <button onClick={() => navigate('/purchase/new')} className="w-full py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Add Purchase</button>
                  <button onClick={() => navigate('/parties')} className="w-full py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Add Party</button>
                </div>
              </div>

              {/* Recent Transactions List */}
              <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
                  <span className="text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/reports')}>View All</span>
                </div>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No recent transactions</p>
                  ) : (
                    transactions.map((txn, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-md transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${txn.type === 'sale' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {txn.type === 'sale' ? '↓' : '↑'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{txn.party?.name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{new Date(txn.transactionDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${txn.type === 'sale' ? 'text-green-600' : 'text-slate-700'}`}>
                          {txn.type === 'sale' ? '+' : '-'}₹{txn.amount}
                        </div>
                      </div>
                    ))
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

export default Home;