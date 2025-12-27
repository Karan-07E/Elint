import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAccountsOrdersSummary, getAccountsEmployees, getEmployeeOrderStats } from '../services/api';
import { LuLayoutDashboard, LuUsers, LuCircleCheck, LuClock, LuCircleAlert } from "react-icons/lu";

const AccountsDashboard = () => {
    const [summary, setSummary] = useState({ total: 0, mapped: 0, not_mapped: 0 });
    const [employees, setEmployees] = useState([]);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [empStats, setEmpStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [summaryRes, empsRes] = await Promise.all([
                getAccountsOrdersSummary(),
                getAccountsEmployees()
            ]);
            setSummary(summaryRes.data || { total: 0, mapped: 0, not_mapped: 0 });
            setEmployees(empsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeChange = async (e) => {
        const empId = e.target.value;
        setSelectedEmpId(empId);
        setEmpStats(null);

        if (empId) {
            try {
                const res = await getEmployeeOrderStats(empId);
                setEmpStats(res.data);
            } catch (error) {
                console.error('Failed to fetch employee stats', error);
            }
        }
    };

    const StatCard = ({ title, value, subtitle, colorClass, icon: Icon }) => (
        <div className={`bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition-all`}>
            {/* Background Decoration */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${colorClass}`}></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-xl ${colorClass} bg-opacity-20 text-slate-700`}>
                        {Icon && <Icon size={18} />}
                    </div>
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
            </div>
            {subtitle && <p className="text-xs text-slate-400 font-medium relative z-10">{subtitle}</p>}
        </div>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <Sidebar />

            <div className="flex-1 ml-64 p-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Accounts Dashboard</h1>
                        <p className="text-sm text-slate-400 mt-1">Overview of order assignments and team workload</p>
                    </div>

                    {/* Section 1: Order Mapping Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Total Orders"
                            value={summary.total}
                            subtitle="All active orders"
                            colorClass="bg-slate-500"
                            icon={LuLayoutDashboard}
                        />
                        <StatCard
                            title="Mapped Orders"
                            value={summary.mapped}
                            subtitle="Assigned to employees"
                            colorClass="bg-emerald-500"
                            icon={LuCircleCheck}
                        />
                        <StatCard
                            title="Not Mapped"
                            value={summary.not_mapped}
                            subtitle="Pending assignment"
                            colorClass="bg-red-500" // Simple Red/Orange as requested
                            icon={LuCircleAlert}
                        />
                    </div>

                    {/* Section 2: Employee Assignment Breakdown */}
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-200/50">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">Employee Assignment Breakdown</h2>

                        <div className="max-w-md mb-8">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Employee</label>
                            <div className="relative">
                                <select
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                                    value={selectedEmpId}
                                    onChange={handleEmployeeChange}
                                >
                                    <option value="">Select an employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Employee Stats Card */}
                        {selectedEmpId && empStats ? (
                            <div className="animate-fade-in bg-slate-50 rounded-[24px] p-6 border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                                        {empStats.employee_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{empStats.employee_name}</h3>
                                        <p className="text-sm text-slate-500">Accountant</p>
                                    </div>
                                </div>
                                <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
                                <div className="flex gap-8 text-center">
                                    <div>
                                        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Total Assigned</p>
                                        <p className="text-2xl font-bold text-slate-800">{empStats.total_assigned}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Pending</p>
                                        <p className="text-2xl font-bold text-amber-500">{empStats.pending}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase font-bold text-slate-400 mb-1">Completed</p>
                                        <p className="text-2xl font-bold text-emerald-500">{empStats.completed}</p>
                                    </div>
                                </div>
                            </div>
                        ) : selectedEmpId ? (
                            <div className="text-center py-8 text-slate-400 animate-pulse">Loading stats...</div>
                        ) : (
                            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                <LuUsers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>Select an employee to view detailed stats</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountsDashboard;
