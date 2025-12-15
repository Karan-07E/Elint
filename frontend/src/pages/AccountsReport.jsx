import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders } from '../services/api';
import { FaSpinner } from 'react-icons/fa';
import { LuSearch, LuFilter, LuCalendar, LuDownload, LuFileText, LuX, LuChevronDown, LuChevronUp } from 'react-icons/lu';

const AccountsReport = () => {
    const navigate = useNavigate();

    // State
    const [orders, setOrders] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [employeeFilter, setEmployeeFilter] = useState('All');
    const [dateRange, setDateRange] = useState('7days'); // 7days, 30days, all

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
                const token = localStorage.getItem('token');

                // Fetch Orders
                const ordersRes = await getAllOrders();

                // Fetch Employees
                let employeesData = [];
                if (token) {
                    try {
                        const usersRes = await fetch('/api/users/team/employees', {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (usersRes.ok) employeesData = await usersRes.json();
                    } catch (e) { console.error('Error fetching employees:', e); }
                }

                setOrders(ordersRes.data || []);
                // Filter only 'employee' role as per AccountsTeamManage pattern
                setEmployees((employeesData || []).filter(u => u.role === 'employee'));
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter Logic
    const filteredOrders = useMemo(() => {
        let result = [...orders];

        // 1. Date Filter
        const now = new Date();
        if (dateRange !== 'all') {
            const days = dateRange === '7days' ? 7 : 30;
            const pastDate = new Date(now.setDate(now.getDate() - days));
            result = result.filter(o => new Date(o.createdAt || o.updatedAt) >= pastDate);
        }

        // 2. Status Filter (Assigned/Unassigned)
        if (statusFilter === 'Assigned') {
            result = result.filter(o => o.assignedAccountEmployee);
        } else if (statusFilter === 'Unassigned') {
            result = result.filter(o => !o.assignedAccountEmployee);
        }

        // 3. Employee Filter
        if (employeeFilter !== 'All') {
            result = result.filter(o => {
                const empId = o.assignedAccountEmployee?._id || o.assignedAccountEmployee;
                return empId === employeeFilter;
            });
        }

        // 4. Search Query (Job #, PO #, Employee Name)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(o => {
                const jobNo = (o.poNumber || '').toLowerCase();
                const poNo = (o.orderNumber || '').toLowerCase(); // Fallback if orderNumber exists
                const empId = o.assignedAccountEmployee?._id || o.assignedAccountEmployee;
                const emp = employees.find(e => e._id === empId);
                const empName = (emp?.name || '').toLowerCase();

                return jobNo.includes(q) || poNo.includes(q) || empName.includes(q);
            });
        }

        return result;
    }, [orders, employees, searchQuery, statusFilter, employeeFilter, dateRange]);

    // Summary Metrics Calculation
    const metrics = useMemo(() => {
        const total = filteredOrders.length;
        const assigned = filteredOrders.filter(o => o.assignedAccountEmployee).length;
        const unassigned = total - assigned;
        // Active employees in ONLY the filtered set
        const activeEmpIds = new Set(filteredOrders.map(o => o.assignedAccountEmployee?._id || o.assignedAccountEmployee).filter(Boolean));

        return { total, assigned, unassigned, activeEmployees: activeEmpIds.size };
    }, [filteredOrders]);

    // Helper to get employee name
    const getEmployeeName = (empId) => {
        const id = empId?._id || empId;
        if (!id) return null;
        const emp = employees.find(e => e._id === id);
        return emp ? emp.name : 'Unknown';
    };

    // CSV Export Handler
    const handleExportCSV = () => {
        if (!filteredOrders.length) {
            alert("No report data available to export.");
            return;
        }

        const headers = ["Job Number", "PO Number", "Item Names", "Assigned Employee Name", "Employee ID", "Order Status", "Assignment Date"];

        const rows = filteredOrders.map(order => {
            const itemNames = (order.items || []).map(i => i.itemName || i.name || "Unknown").join("; ");
            const empName = getEmployeeName(order.assignedAccountEmployee) || "Not Assigned";
            const empObj = employees.find(e => e._id === (order.assignedAccountEmployee?._id || order.assignedAccountEmployee));
            const empId = empObj ? empObj.employeeId : (order.assignedAccountEmployee ? "Unknown ID" : "-");
            const date = new Date(order.updatedAt).toLocaleDateString();

            // STRICT MAPPING RULES FIXED:
            // 1. Job Number: UI uses order.poNumber, so CSV must match it.
            // 2. PO Number: Instruction says separate mapping to order.poNumber.
            // Result: Both columns use order.poNumber because it's the only valid business ID in DB.

            const jobVal = order.poNumber || 'NA';
            const poVal = order.poNumber || 'NA';

            return [
                `"${jobVal}"`,
                `"${poVal}"`,
                `"${itemNames}"`,
                `"${empName}"`,
                `"${empId}"`,
                `"${order.status}"`,
                `"${date}"`
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reports_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                {/* 1. Header (Distinct from Dashboard) */}
                <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <LuFileText className="text-slate-400" />
                            Reports
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">
                            Operational review: Orders, assignments, and personnel tracking.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-slate-500 focus:border-slate-500 block px-3 py-2 cursor-pointer"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <button
                            onClick={handleExportCSV}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <LuDownload size={16} /> Export CSV
                        </button>
                    </div>
                </header>

                {/* 2. Summary Strip (Horizontal Bar) */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Orders</span>
                        <span className="text-2xl font-bold text-slate-800">{metrics.total}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned</span>
                        <span className="text-2xl font-bold text-emerald-600">{metrics.assigned}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unassigned</span>
                        <span className="text-2xl font-bold text-amber-500">{metrics.unassigned}</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Staff</span>
                        <span className="text-2xl font-bold text-blue-600">{metrics.activeEmployees}</span>
                    </div>
                </div>

                {/* 3. Filters Toolbar */}
                <div className="bg-white p-4 rounded-t-lg border border-slate-200 border-b-0 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-3 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <LuSearch className="w-4 h-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                                placeholder="Search Job #, PO, or Employee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2">
                            <LuFilter className="text-slate-400 w-4 h-4" />
                            <span className="text-sm text-slate-600 font-medium">Filters:</span>
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 cursor-pointer min-w-[140px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Assigned">Assigned</option>
                            <option value="Unassigned">Unassigned</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 cursor-pointer min-w-[160px]"
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                        >
                            <option value="All">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 4. Data Table */}
                <div className="relative overflow-x-auto border border-slate-200 rounded-b-lg shadow-sm bg-white">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-semibold">Job Number</th>
                                <th scope="col" className="px-6 py-3 font-semibold">PO / Order ID</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Item Name</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Assigned To</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Emp ID</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                                <th scope="col" className="px-6 py-3 font-semibold">Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-400">
                                            <FaSpinner className="animate-spin" /> Loading report data...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        No matching records found for the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const empName = getEmployeeName(order.assignedAccountEmployee);
                                    // Robust access to emp id for display
                                    const empObj = employees.find(e => e._id === (order.assignedAccountEmployee?._id || order.assignedAccountEmployee));
                                    const empDisplayId = empObj ? (empObj.employeeId || 'N/A') : '-';
                                    const isExpanded = expandedOrderId === order._id;

                                    return (
                                        <React.Fragment key={order._id}>
                                            <tr className={`bg-white hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}>
                                                <td className="px-6 py-4 font-medium text-slate-900 border-l-4 border-transparent hover:border-blue-500 transition-all">
                                                    {order.poNumber || <span className="text-slate-300 italic">No Job #</span>}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                    {order._id.substring(order._id.length - 8).toUpperCase()}
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 relative">
                                                    <div className="flex items-center gap-2">
                                                        <span>{order.items?.[0]?.itemName || 'Unknown Item'}</span>
                                                        {order.items?.length > 1 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedOrderId(isExpanded ? null : order._id);
                                                                }}
                                                                className={`
                                                                    ml-1 text-xs px-2 py-0.5 rounded-full font-medium transition-all flex items-center gap-1
                                                                    ${isExpanded
                                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                                        : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}
                                                                `}
                                                            >
                                                                +{order.items.length - 1} more
                                                                {isExpanded ? <LuChevronUp size={10} /> : <LuChevronDown size={10} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {empName ? (
                                                        <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            {empName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Not Assigned</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                                    {empDisplayId}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold
                                                        ${order.status === 'Completed' ? 'bg-green-50 text-green-700' :
                                                            order.status === 'New' ? 'bg-orange-50 text-orange-700' :
                                                                'bg-slate-100 text-slate-600'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-500">
                                                    {new Date(order.updatedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                            {/* Expandable Row for Items Drilldown */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/50 shadow-inner">
                                                    <td colSpan="7" className="px-6 py-4 pl-12">
                                                        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm max-w-2xl">
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                                                                <span>All Items in Job {order.poNumber}</span>
                                                                <button onClick={() => setExpandedOrderId(null)} className="text-slate-400 hover:text-slate-600">
                                                                    <LuX size={14} />
                                                                </button>
                                                            </h4>
                                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                                                {order.items.map((item, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
                                                                                {idx + 1}
                                                                            </span>
                                                                            <span className="text-slate-700 font-medium">{item.itemName || item.name || 'Unknown Item'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            {item.unit && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 rounded">{item.unit}</span>}
                                                                            <span className="font-mono text-slate-600 font-medium">
                                                                                Qty: {item.quantity || 0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Footer / Pagination Placeholder */}
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                            Showing <span className="font-medium text-slate-900">{filteredOrders.length}</span> records
                        </span>
                        {/* Pagination controls could be added here if backend supported pagination parameters or client-side slice */}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default AccountsReport;
