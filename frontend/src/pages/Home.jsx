import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getDashboardSummary, getOrderChartData, getRecentTransactions } from '../services/api';
import Sidebar from '../components/Sidebar';
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
      setLoading(true);
      try {
        // Fetch data independently to prevent one failure from breaking everything
        const summaryReq = getDashboardSummary()
          .then(res => res.data)
          .catch(err => {
            console.error("Summary API failed:", err); 
            return { counts: { inQueue: 0, inProgress: 0 }, queueList: [], progressList: [] };
          });

        const chartReq = getOrderChartData(period)
          .then(res => res.data)
          .catch(err => {
            console.error("Chart API failed:", err);
            return [];
          });

        const txnReq = getRecentTransactions()
          .then(res => res.data)
          .catch(err => {
            console.error("Transaction API failed:", err);
            return [];
          });

        const [summaryData, chartDataRes, txnData] = await Promise.all([summaryReq, chartReq, txnReq]);

        setSummary(summaryData || { counts: { inQueue: 0, inProgress: 0 }, queueList: [], progressList: [] });
        setChartData(chartDataRes || []);
        setTransactions(txnData || []);
      } catch (error) {
        console.error('Critical Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [period]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Sidebar />
      <div className="ml-64 p-6">
        
        {/* Top Header */}
        <header className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome to <span className="text-blue-600">Elints</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/orders/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg shadow-blue-200"
            >
              + Create Order
            </button>
            <button 
              onClick={handleLogout}
              className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
            
            {/* Main Content Area (Left 2 Columns) */}
            <div className="flex flex-col gap-6 xl:col-span-2">
              
              {/* 1. Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Orders In Queue (New) */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 relative overflow-hidden group hover:border-orange-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="text-8xl">⏳</span>
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">In Queue (New)</h3>
                      <div className="text-4xl font-bold text-slate-800">{summary.counts?.inQueue || 0}</div>
                    </div>
                    <span className="bg-orange-50 text-orange-600 text-xs px-3 py-1 rounded-full font-medium border border-orange-100">
                      Pending Processing
                    </span>
                  </div>
                  
                  {/* Dropdown List */}
                  <div className="mt-2 relative z-10">
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Recent New Orders</label>
                    <select 
                      className="w-full text-sm border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50 p-2.5 text-slate-700 outline-none transition-all cursor-pointer hover:bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>View Orders ({summary.queueList?.length || 0})</option>
                      {summary.queueList?.length > 0 ? (
                        summary.queueList.map(order => (
                          <option key={order.id} value={order.id}>
                            {order.poNumber} - {order.customerName}
                          </option>
                        ))
                      ) : (
                        <option disabled>No new orders</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Orders In Progress */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 relative overflow-hidden group hover:border-blue-300 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="text-8xl">⚙️</span>
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">In Progress</h3>
                      <div className="text-4xl font-bold text-slate-800">{summary.counts?.inProgress || 0}</div>
                    </div>
                    <span className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full font-medium border border-blue-100">
                      Active Production
                    </span>
                  </div>

                  {/* Dropdown List */}
                  <div className="mt-2 relative z-10">
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Active Orders</label>
                    <select 
                      className="w-full text-sm border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 p-2.5 text-slate-700 outline-none transition-all cursor-pointer hover:bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>View Orders ({summary.progressList?.length || 0})</option>
                      {summary.progressList?.length > 0 ? (
                        summary.progressList.map(order => (
                          <option key={order.id} value={order.id}>
                            {order.poNumber} - {order.status}
                          </option>
                        ))
                      ) : (
                        <option disabled>No active orders</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Graph Section - FIXED HEIGHT */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Order Trends</h3>
                  <select
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 bg-white cursor-pointer hover:border-blue-300 transition-colors"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                {/* ✅ FIXED: Added explicit height container */}
                <div className="w-full h-80" style={{ minHeight: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        axisLine={false} 
                        tickLine={false} 
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }} 
                        iconType="circle"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="inQueue" 
                        name="New / In Queue"
                        stroke="#f97316" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6, strokeWidth: 0 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="inProgress" 
                        name="In Progress"
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6, strokeWidth: 0 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="flex flex-col gap-6">
              {/* Quick Actions Card */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-sm mx-auto">
                  🚀
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Quick Actions</h3>
                <p className="text-slate-500 text-xs mb-6">Manage your business efficiently with shortcuts.</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/sale/new')} 
                    className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>📝</span> Create Invoice
                  </button>
                  <button 
                    onClick={() => navigate('/purchase/new')} 
                    className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>🛒</span> Add Purchase Bill
                  </button>
                  <button 
                    onClick={() => navigate('/parties')} 
                    className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    <span>👥</span> Add New Party
                  </button>
                </div>
              </div>

              {/* Recent Activity List */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                  <button 
                    onClick={() => navigate('/reports')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View All
                  </button>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No recent transactions found.
                    </div>
                  ) : (
                    transactions.map((txn, i) => (
                      <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-default">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${
                            txn.type === 'sale' ? 'bg-green-100 text-green-600' : 
                            txn.type === 'purchase' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {txn.type === 'sale' ? '↓' : txn.type === 'purchase' ? '↑' : '•'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{txn.party?.name || 'Unknown Party'}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {new Date(txn.transactionDate).toLocaleDateString()} • <span className="capitalize">{txn.paymentMode || 'Cash'}</span>
                            </p>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${
                          txn.type === 'sale' || txn.type === 'payment_in' ? 'text-green-600' : 'text-slate-700'
                        }`}>
                          {txn.type === 'sale' || txn.type === 'payment_in' ? '+' : '-'}₹{Number(txn.amount).toLocaleString()}
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