import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAllOrders } from '../services/api';
import {
    LuSearch,
    LuFilter,
    LuCircleAlert,
    LuCalendar,
    LuCircleCheck,
    LuCircleX,
    LuChevronRight,
    LuUser,
    LuArrowRight
} from "react-icons/lu";

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const isToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
};

const getStatusBadgeStyles = (isMapped) => {
    return isMapped
        ? "bg-green-50 text-green-700 border border-green-100"
        : "bg-slate-100 text-slate-500 border border-slate-200";
};

const getPriorityStyles = (priority) => {
    const p = (priority || 'Normal').toLowerCase();
    if (p === 'high') return "bg-red-50 text-red-600 border border-red-100";
    if (p === 'medium') return "bg-amber-50 text-amber-600 border border-amber-100";
    return "bg-slate-50 text-slate-600 border border-slate-100";
};

// --- Components ---

const OrderDetailPanel = ({ order, employees = [], onClose }) => {
    if (!order) return null;

    const orderPriority = (order.items || []).some(it => it.priority === 'High') ? 'High' : (order.priority || 'Normal');
    const resolveEmployee = () => {
        const empVal = order.assignedAccountEmployee || order.accountsEmployee;
        if (!empVal) return null;

        if (typeof empVal === 'object' && empVal.name) return empVal;

        // Lookup ID
        return employees.find(e => e._id === empVal || e.id === empVal);
    };

    const assignedEmp = resolveEmployee();

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{order.poNumber}</h3>
                    <p className="text-sm text-slate-500 mt-1">{order.customerName || order.party?.name}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <LuArrowRight size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {/* Status Section */}
                <div className="mb-8">
                    <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Status & Assignment</h4>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Priority</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityStyles(orderPriority)}`}>
                                {orderPriority}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Assigned To</span>
                            <div className="flex items-center gap-2">
                                {assignedEmp ? (
                                    <>
                                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                            {(assignedEmp.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-slate-800">{assignedEmp.name || 'Unknown'}</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Not Assigned</span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Order Status</span>
                            <span className="text-sm font-medium text-slate-800">{order.status}</span>
                        </div>
                    </div>
                </div>

                {/* Dates Section */}
                <div className="mb-8">
                    <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Key Dates</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-slate-100 rounded-xl p-3">
                            <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                            <span className="text-sm font-medium text-slate-700">{formatDate(order.poDate)}</span>
                        </div>
                        <div className="border border-slate-100 rounded-xl p-3">
                            <span className="text-[10px] text-slate-400 block mb-1">Deadline</span>
                            <span className={`text-sm font-medium ${new Date(order.estimatedDeliveryDate) < new Date() ? 'text-red-500' : 'text-slate-700'}`}>
                                {formatDate(order.estimatedDeliveryDate)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div>
                    <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">Order Items</h4>
                    <div className="space-y-3">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{item.itemName || item.name}</p>
                                    <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                                </div>
                                <span className="text-sm font-semibold text-slate-600">₹{item.amount?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Total Amount</span>
                        <span className="font-bold text-lg text-slate-900">₹{(order.totalAmount || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ManageOrders = () => {
    const [orders, setOrders] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, mapped, not-mapped
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const navigate = useNavigate();

    const handleAssignNow = (e, orderId) => {
        e.stopPropagation(); // Prevent opening the side panel
        navigate(`/orders/teams?orderId=${orderId}`);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');

                // Fetch Orders
                const ordersRes = await getAllOrders();
                setOrders(ordersRes.data || []);

                // Fetch Employees for resolution
                if (token) {
                    try {
                        const usersRes = await fetch('/api/users/team/employees', {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (usersRes.ok) {
                            const emps = await usersRes.json();
                            setEmployees(emps);
                        }
                    } catch (e) {
                        console.error('Failed to fetch employees', e);
                    }
                }
            } catch (err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Derived State ---

    const highPriorityOrders = useMemo(() =>
        orders.filter(o => (o.items || []).some(i => (i.priority || '').toLowerCase() === 'high')).slice(0, 5),
        [orders]);

    const todayTasks = useMemo(() =>
        orders.filter(o => isToday(o.estimatedDeliveryDate) || isToday(o.createdAt)).slice(0, 5),
        [orders]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const isMapped = !!(order.assignedAccountEmployee || order.accountsEmployee);

            // Filter Logic
            if (filter === 'mapped' && !isMapped) return false;
            if (filter === 'not-mapped' && isMapped) return false;

            // Search Logic
            if (search) {
                const term = search.toLowerCase();
                const po = (order.poNumber || '').toLowerCase();
                const cust = (order.customerName || order.party?.name || '').toLowerCase();
                if (!po.includes(term) && !cust.includes(term)) return false;
            }

            return true;
        });
    }, [orders, filter, search]);

    const getMappedEmployee = (order) => {
        const empVal = order.assignedAccountEmployee || order.accountsEmployee;
        if (!empVal) return null;

        // If it's already an object with name
        if (typeof empVal === 'object' && empVal.name) return empVal.name;

        // If it's an ID, look it up
        if (typeof empVal === 'string') {
            const found = employees.find(e => e._id === empVal || e.id === empVal);
            return found ? found.name : 'Unknown Employee';
        }

        return 'Unknown';
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            <Sidebar />

            <div className="flex-1 ml-64 p-8 overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Orders</h1>
                        <p className="text-sm text-slate-500 mt-1">Track and assign customer orders</p>
                    </div>
                </div>

                {/* Top Section: Quick Stats / Highlights */}
                <div className="grid grid-cols-12 gap-8 mb-8">

                    {/* High Priority Orders */}
                    <div className="col-span-12 md:col-span-7 xl:col-span-8">
                        <div className="bg-white rounded-[24px] border border-red-50 shadow-sm overflow-hidden h-full flex flex-col">
                            <div className="px-6 py-5 border-b border-red-50 bg-red-50/10 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                        <LuCircleAlert size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">High Priority Attention</h3>
                                        <p className="text-xs text-slate-500">Orders requiring immediate action</p>
                                    </div>
                                </div>
                                <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold">
                                    {highPriorityOrders.length}
                                </span>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto max-h-[220px]">
                                {highPriorityOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                                        <p className="text-sm">No high priority orders.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {highPriorityOrders.map(order => (
                                            <div key={order._id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-red-100 hover:bg-red-50/30 transition-all cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-500 group-hover:bg-white group-hover:text-red-500 group-hover:shadow-sm transition-all">
                                                        PO
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-red-700 transition-colors">{order.poNumber}</p>
                                                        <p className="text-xs text-slate-500">{order.customerName || order.party?.name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase text-slate-400 font-semibold">Deadline</p>
                                                    <p className="text-xs font-medium text-red-500">{formatDate(order.estimatedDeliveryDate)}</p>
                                                </div>
                                                <div className="hidden sm:block">
                                                    {order.assignedAccountEmployee ? (
                                                        <span className="text-xs flex items-center gap-1.5 text-green-600 font-medium px-2 py-1 bg-green-50 rounded-lg">
                                                            <LuCircleCheck size={12} /> Assigned
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => handleAssignNow(e, order._id)}
                                                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                                            Assign Now
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Today's Tasks */}
                    <div className="col-span-12 md:col-span-5 xl:col-span-4">
                        <div className="bg-white rounded-[24px] border border-blue-50 shadow-sm overflow-hidden h-full flex flex-col">
                            <div className="px-6 py-5 border-b border-blue-50 bg-blue-50/10 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <LuCalendar size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">Today's Activity</h3>
                                        <p className="text-xs text-slate-500">Deadlines & New Orders</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto max-h-[220px]">
                                {todayTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6">
                                        <p className="text-sm">No activity for today.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todayTasks.map(order => (
                                            <div key={order._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-blue-50/30 transition-colors" onClick={() => setSelectedOrder(order)}>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700">{order.poNumber}</p>
                                                    <span className={`text-[10px] uppercase font-bold ${isToday(order.estimatedDeliveryDate) ? 'text-red-500' : 'text-blue-500'}`}>
                                                        {isToday(order.estimatedDeliveryDate) ? 'Due Today' : 'Created Today'}
                                                    </span>
                                                </div>
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition-all">
                                                    <LuChevronRight size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Main Table Section: Order Mapping Status */}
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                    {/* Table Header & Controls */}
                    <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Order Mapping Status</h2>
                            <p className="text-xs text-slate-400 mt-1">Overview of all order assignments</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search PO or Customer..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
                                />
                            </div>

                            {/* Filter */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <LuFilter size={14} />
                                </div>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-50 transition-all"
                                >
                                    <option value="all">All Orders</option>
                                    <option value="mapped">Mapped</option>
                                    <option value="not-mapped">Not Mapped</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <LuChevronRight size={12} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-8 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mapped To</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-12 text-center text-slate-400">Loading orders...</td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-12 text-center text-slate-400">No orders found matching your filters.</td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(order => {
                                        const mappedEmp = getMappedEmployee(order);
                                        const isMapped = !!mappedEmp;

                                        return (
                                            <tr key={order._id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                                <td className="px-8 py-4">
                                                    <span className="font-semibold text-slate-700 text-sm">{order.poNumber}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold mr-2">
                                                            {(order.customerName || order.party?.name || 'C').charAt(0)}
                                                        </div>
                                                        <span className="text-sm text-slate-600">{order.customerName || order.party?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600">{formatDate(order.estimatedDeliveryDate)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        const derived = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal');
                                                        return (
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getPriorityStyles(derived)}`}>
                                                                {derived}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-mono text-slate-600">₹{(order.totalAmount || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isMapped ? (
                                                        <div className="flex items-center gap-2">
                                                            <LuUser size={14} className="text-blue-400" />
                                                            <span className="text-sm font-medium text-slate-700">{mappedEmp}</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => handleAssignNow(e, order._id)}
                                                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                                                        >
                                                            Assign Now
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeStyles(isMapped)}`}>
                                                        {isMapped ? <LuCircleCheck size={12} /> : <LuCircleX size={12} />}
                                                        {isMapped ? 'Mapped' : 'Not Mapped'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Side Panel Overlay */}
            {selectedOrder && (
                <>
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedOrder(null)} />
                    <OrderDetailPanel order={selectedOrder} employees={employees} onClose={() => setSelectedOrder(null)} />
                </>
            )}

        </div>
    );
};

export default ManageOrders;
