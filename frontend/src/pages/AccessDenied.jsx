import React from 'react';
import { Link } from 'react-router-dom';
import { LuShieldAlert } from "react-icons/lu";

const AccessDenied = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center max-w-md">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <LuShieldAlert className="text-red-500 text-3xl" />
                </div>

                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-slate-500 mb-8">
                    This page is restricted to the Accounts team only. You do not have permission to view this content.
                </p>

                <Link
                    to="/employee/dashboard"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                    Return to My Orders
                </Link>
            </div>
        </div>
    );
};

export default AccessDenied;
