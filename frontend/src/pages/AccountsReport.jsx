import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders, getMappings } from '../services/api';
import { FaSpinner } from 'react-icons/fa';
import { LuSearch, LuFilter, LuDownload, LuFileText } from 'react-icons/lu';

const AccountsReport = () => {
    const navigate = useNavigate();

    // State
    const [orders, setOrders] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [employeeFilter, setEmployeeFilter] = useState('All');
    const [dateRange, setDateRange] = useState('7days'); // 7days, 30days, all

    // Logout Logic
    const handleLogout = async () => { /* ... same as before if needed, or inherited ... */ };

    // Fetch Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const token = localStorage.getItem('token');

                // Parallel Fetch
                const [ordersRes, mappingsRes] = await Promise.all([
                    getAllOrders(),
                    getMappings().catch(err => ({ data: [] })) // Graceful fail
                ]);

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
                setMappings(mappingsRes.data || []);
                setEmployees((employeesData || []).filter(u => u.role === 'employee'));
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Create a Lookup Map for Job Numbers
    // mappings structure: [ { _id: orderId, items: [ { itemId, jobNumber } ] } ]
    const jobNumbersMap = useMemo(() => {
        const map = {};
        mappings.forEach(m => {
            const orderId = m._id || m.orderId; // handle aggregate result vs raw
            if (m.items && Array.isArray(m.items)) {
                m.items.forEach(item => {
                    // create a key: orderId_itemId
                    // Ensure itemId is string
                    const iId = item.itemId ? item.itemId.toString() : '';
                    if (iId) map[`${orderId}_${iId}`] = item.jobNumber;
                });
            }
        });
        return map;
    }, [mappings]);

    // Flatten Orders into Items (The Requirement: One row per item)
    const allItems = useMemo(() => {
        const flattened = [];
        orders.forEach(order => {
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const iId = item._id || item.item; // item._id is the subdocument id
                    const jobNo = jobNumbersMap[`${order._id}_${iId}`] || '';

                    flattened.push({
                        ...item,
                        // Enrich with Order Context
                        orderId: order._id,
                        poNumber: order.poNumber,
                        orderDate: order.createdAt || order.updatedAt,
                        orderStatus: order.status,
                        assignedAccountEmployee: order.assignedAccountEmployee, // Order level assignee
                        // Item level specific
                        jobNumber: jobNo,
                        // Inherit or override assignedTo
                        assignedTo: item.assignedTo || order.assignedAccountEmployee
                    });
                });
            } else {
                // Should we show orders with no items? Probably not relevant for "Item Job Numbers" report.
            }
        });
        return flattened;
    }, [orders, jobNumbersMap]);

    // Filter Logic on FLATTENED Items
    const filteredItems = useMemo(() => {
        let result = [...allItems];

        // 1. Date Filter (using Order Date)
        const now = new Date();
        if (dateRange !== 'all') {
            const days = dateRange === '7days' ? 7 : 30;
            const pastDate = new Date(now.setDate(now.getDate() - days));
            result = result.filter(i => new Date(i.orderDate) >= pastDate);
        }

        // 2. Status Filter
        if (statusFilter === 'Assigned') {
            // Check if item has job number OR is assigned
            result = result.filter(i => i.jobNumber || i.assignedTo);
        } else if (statusFilter === 'Unassigned') {
            result = result.filter(i => !i.jobNumber && !i.assignedTo);
        }

        // 3. Employee Filter
        if (employeeFilter !== 'All') {
            result = result.filter(i => {
                const empId = i.assignedTo?._id || i.assignedTo;
                return empId === employeeFilter;
            });
        }

        // 4. Search Query (Job #, PO #, Employee Name, Item Name)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(i => {
                const jobNo = (i.jobNumber || '').toLowerCase();
                const poNo = (i.poNumber || '').toLowerCase();
                const itemName = (i.itemName || i.name || '').toLowerCase();

                const empId = i.assignedTo?._id || i.assignedTo;
                const emp = employees.find(e => e._id === empId);
                const empName = (emp?.name || '').toLowerCase();

                return jobNo.includes(q) || poNo.includes(q) || itemName.includes(q) || empName.includes(q);
            });
        }

        return result;
    }, [allItems, employees, searchQuery, statusFilter, employeeFilter, dateRange]);

    // Metrics based on Item count
    const metrics = useMemo(() => {
        return {
            totalItems: filteredItems.length,
            assignedItems: filteredItems.filter(i => i.jobNumber).length, // Strictly those with Job Numbers
            totalValue: filteredItems.reduce((acc, curr) => acc + (curr.amount || 0), 0)
        };
    }, [filteredItems]);

    // Helper
    const getEmployeeName = (empId) => {
        const id = empId?._id || empId;
        if (!id) return null;
        const emp = employees.find(e => e._id === id);
        return emp ? emp.name : 'Unknown';
    };

    const getEmployeeId = (empId) => {
        const id = empId?._id || empId;
        if (!id) return null;
        const emp = employees.find(e => e._id === id);
        return emp ? emp.employeeId : '-';
    };

    // CSV Export
    const handleExportCSV = () => {
        if (!filteredItems.length) {
            alert("No data to export.");
            return;
        }
        const headers = ["Job Number", "PO Number", "Item Name", "Quantity", "Amount", "Assigned Employee", "Employee ID", "Assignment Date"];
        const rows = filteredItems.map(item => {
            const empName = getEmployeeName(item.assignedTo) || "Not Assigned";
            const empId = getEmployeeId(item.assignedTo) || "-";
            // Date: Ideally mapping creation date, but we use order update date as proxy if not available
            const date = new Date(item.orderDate).toLocaleDateString();

            return [
                `"${item.jobNumber || 'Pending'}"`,
                `"${item.poNumber || ''}"`,
                `"${item.itemName || item.name || ''}"`,
                `"${item.quantity || 0}"`,
                `"${item.amount || 0}"`,
                `"${empName}"`,
                `"${empId}"`,
                `"${date}"`
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `item_reports_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
            <Sidebar />

            <main className="flex-1 ml-64 p-8">
                {/* Header */}
                <header className="flex justify-between items-end mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <LuFileText className="text-slate-400" />
                            Item Reports
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">
                            Granular tracking of all items and their job numbers.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg block px-3 py-2 cursor-pointer"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <button
                            onClick={handleExportCSV}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <LuDownload size={16} /> Export CSV
                        </button>
                    </div>
                </header>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Items</span>
                        <div className="text-2xl font-bold text-slate-800">{metrics.totalItems}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Items</span>
                        <div className="text-2xl font-bold text-emerald-600">{metrics.assignedItems}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</span>
                        <div className="text-2xl font-bold text-blue-600">₹{metrics.totalValue.toLocaleString()}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-t-lg border border-slate-200 border-b-0 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 min-w-[300px]">
                        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg block w-full pl-10 p-2.5"
                            placeholder="Search Job #, PO, or Item..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2">
                            <LuFilter className="text-slate-400" />
                            <span className="text-sm font-medium">Filters:</span>
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-300 text-sm rounded-lg px-3 py-2 cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Assigned">Assigned w/ Job #</option>
                            <option value="Unassigned">Unassigned</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-300 text-sm rounded-lg px-3 py-2 cursor-pointer"
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

                {/* Table */}
                <div className="relative overflow-x-auto border border-slate-200 rounded-b-lg shadow-sm bg-white">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Job Number</th>
                                <th className="px-6 py-3 font-semibold">PO Number</th>
                                <th className="px-6 py-3 font-semibold">Item Name</th>
                                <th className="px-6 py-3 font-semibold text-right">Qty</th>
                                <th className="px-6 py-3 font-semibold text-right">Amt</th>
                                <th className="px-6 py-3 font-semibold">Assigned To</th>
                                <th className="px-6 py-3 font-semibold">Emp ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400"><FaSpinner className="animate-spin inline mr-2" />Loading...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">No items found.</td></tr>
                            ) : (
                                filteredItems.map((item, idx) => {
                                    const empName = getEmployeeName(item.assignedTo);
                                    const empId = getEmployeeId(item.assignedTo);

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {item.jobNumber ? (
                                                    <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                                                        {item.jobNumber}
                                                    </span>
                                                ) : <span className="text-slate-300 italic">Pending</span>}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs">{item.poNumber}</td>
                                            <td className="px-6 py-4 font-medium">{item.itemName || item.name}</td>
                                            <td className="px-6 py-4 text-right font-mono">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right font-mono">{item.amount?.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                {empName ? (
                                                    <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {empName}
                                                    </span>
                                                ) : <span className="text-slate-400 italic text-xs">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{empId}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                        <span>Showing {filteredItems.length} items</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AccountsReport;
