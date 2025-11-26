import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getOrderFlowStats, getOrderTree, updateOrderStatus } from '../services/api';
import { FaChevronRight, FaChevronDown, FaBoxOpen, FaCheckCircle, FaIndustry, FaFileAlt, FaTruck, FaPlus, FaTimes, FaStickyNote, FaHistory } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

const OrderDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [treeData, setTreeData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [selectedStage, setSelectedStage] = useState(null);
  
  // ✅ NEW: State to toggle note history view
  const [expandedNotes, setExpandedNotes] = useState({}); 

  const flowStages = [
    { key: 'New', label: 'New Orders', icon: <FaBoxOpen />, color: 'bg-blue-100 text-blue-600', border: 'border-blue-200' },
    { key: 'Verified', label: 'Verify Stage', icon: <MdVerified />, color: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-200' },
    { key: 'Manufacturing', label: 'Mfg Stage', icon: <FaIndustry />, color: 'bg-orange-100 text-orange-600', border: 'border-orange-200' },
    { key: 'Quality_Check', label: 'QC Check', icon: <FaCheckCircle />, color: 'bg-purple-100 text-purple-600', border: 'border-purple-200' },
    { key: 'Documentation', label: 'Doc', icon: <FaFileAlt />, color: 'bg-yellow-100 text-yellow-600', border: 'border-yellow-200' },
    { key: 'Dispatch', label: 'Dispatch', icon: <FaTruck />, color: 'bg-green-100 text-green-600', border: 'border-green-200' },
  ];

  const statusOptions = [
    'New', 'Verified', 'Manufacturing', 'Quality_Check', 'Documentation', 'Dispatch', 'Completed', 'Deleted'
  ];

  const fetchData = async () => {
    try {
      const [statsRes, treeRes] = await Promise.all([
        getOrderFlowStats(),
        getOrderTree(search)
      ]);
      setStats(statsRes.data);
      setTreeData(treeRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading order data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const toggleCustomer = (customerId) => {
    setExpandedCustomers(prev => ({ ...prev, [customerId]: !prev[customerId] }));
  };

  // ✅ Toggle Visibility of Notes for specific order
  const toggleNotes = (orderId) => {
    setExpandedNotes(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // ✅ Handle Status Change with Note Prompt
  const handleStatusChange = async (orderId, newStatus) => {
    // Prompt user for a note
    const note = window.prompt(`Changing status to ${newStatus}. \n\nAdd a note (optional):`, "");
    
    if (note === null) return; // User pressed Cancel

    try {
      await updateOrderStatus(orderId, newStatus, note || `Moved to ${newStatus}`);
      await fetchData(); 
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const filteredTreeData = treeData.map(group => {
    if (!selectedStage) return group; 
    const filteredOrders = group.orders.filter(order => order.status === selectedStage);
    if (filteredOrders.length === 0) return null; 
    return { ...group, orders: filteredOrders };
  }).filter(Boolean); 

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
          <button 
            onClick={() => navigate('/orders/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
          >
            <FaPlus /> Create New Order
          </button>
        </div>

        <div className="grid grid-cols-6 gap-4 mb-8">
          {flowStages.map((stage, index) => {
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
                  <div className="text-2xl font-bold mt-1">{stats[stage.key] || 0}</div>
                  {isSelected && <div className="absolute top-2 right-2 text-xs bg-white bg-opacity-30 rounded-full px-2 py-0.5">Selected</div>}
                </div>
                {index < flowStages.length - 1 && (
                  <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-0 text-slate-300 group-hover:text-slate-400">
                    <FaChevronRight />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                {selectedStage ? `${selectedStage.replace('_', ' ')} Orders` : 'All Active Orders'}
              </h2>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                Grouped by Customer &gt; PO
                {selectedStage && (
                  <button 
                    onClick={() => setSelectedStage(null)}
                    className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full hover:bg-red-200 flex items-center gap-1 transition-colors"
                  >
                    <FaTimes size={10} /> Clear Filter
                  </button>
                )}
              </p>
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Filter Customer</label>
              <input 
                type="text" 
                placeholder="Type customer name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : filteredTreeData.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">No orders found.</p>
              </div>
            ) : filteredTreeData.map((group) => (
              <div key={group._id} className="border border-gray-200 rounded-md overflow-hidden transition-all hover:shadow-sm">
                <div 
                  onClick={() => toggleCustomer(group._id)}
                  className="bg-white p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs transition-transform duration-200" style={{ transform: expandedCustomers[group._id] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <FaChevronDown />
                    </div>
                    <span className="font-semibold text-slate-800">{group.customerName}</span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {group.orders.length} POs
                    </span>
                  </div>
                </div>

                {expandedCustomers[group._id] && (
                  <div className="bg-slate-50 p-3 pl-12 space-y-3 border-t border-gray-100">
                    {group.orders.map((order) => (
                      <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-700">PO: {order.poNumber}</span>
                              
                              {/* STATUS DROPDOWN */}
                              <div className="relative">
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                  className={`
                                    text-xs font-medium px-2 py-1 rounded border cursor-pointer outline-none appearance-none pr-6
                                    ${order.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                      order.status === 'Verified' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                                      order.status === 'Manufacturing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      order.status === 'Dispatch' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-gray-100 text-gray-600 border-gray-200'
                                    }
                                  `}
                                >
                                  {statusOptions.map(status => (
                                    <option key={status} value={status}>{status.replace('_', ' ')}</option>
                                  ))}
                                </select>
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-xs opacity-50">▼</div>
                              </div>

                              {/* ✅ NOTES BUTTON */}
                              <button 
                                onClick={() => toggleNotes(order._id)}
                                className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${expandedNotes[order._id] ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                title="View Note History"
                              >
                                <FaStickyNote /> Notes
                              </button>

                              {order.priority === 'High' && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                                  🔥 High Priority
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">PO Date: {new Date(order.poDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">₹{order.totalAmount.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* ✅ NOTE HISTORY SECTION */}
                        {expandedNotes[order._id] && (
                          <div className="mb-3 bg-amber-50 border border-amber-100 rounded p-3 text-sm">
                            <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                              <FaHistory /> Status Change History
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {order.statusHistory && order.statusHistory.length > 0 ? (
                                order.statusHistory.slice().reverse().map((history, idx) => (
                                  <div key={idx} className="flex gap-3 text-xs border-b border-amber-100 last:border-0 pb-1">
                                    <div className="text-amber-500 font-mono whitespace-nowrap">
                                      {new Date(history.timestamp).toLocaleString()}
                                    </div>
                                    <div>
                                      <span className="font-bold text-amber-900">{history.status}:</span> <span className="text-amber-800">{history.note}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-amber-600 text-xs italic">No history available.</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-50 rounded border border-gray-100 overflow-hidden">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-gray-100 text-gray-500">
                              <tr>
                                <th className="px-3 py-2 font-medium">Item Name</th>
                                <th className="px-3 py-2 font-medium">Delivery Date</th>
                                <th className="px-3 py-2 font-medium">Qty</th>
                                <th className="px-3 py-2 font-medium text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {order.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2 text-slate-700">{item.itemName}</td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">{item.quantity} {item.unit}</td>
                                  <td className="px-3 py-2 text-right font-medium text-slate-700">₹{item.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDashboard;