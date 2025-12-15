import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import ItemPage from "./pages/item.jsx";
import SaleInvoice from "./pages/SaleInvoice.jsx";
import SaleReport from "./pages/SaleReport.jsx";
import Purchase from "./pages/Purchase.jsx";
import PurchaseBill from "./pages/PurchaseBill.jsx";
import PurchaseReport from "./pages/PurchaseReport.jsx";
import PartiesPage from "./pages/Parties.jsx";
import Settings from "./pages/Settings.jsx";
import OrderDashboard from "./pages/OrderDashboard.jsx";
import CreateOrder from "./pages/CreateOrder.jsx";
import ManageTeams from "./pages/ManageTeams.jsx";
import OrderCalendar from "./pages/OrderCalendar.jsx";
import AccountsTeamManage from "./pages/AccountsTeamManage.jsx";
import ManageOrders from "./pages/ManageOrders.jsx";
import AccountsReport from "./pages/AccountsReport.jsx";
import AccountsDashboard from "./pages/AccountsDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AccessDenied from "./pages/AccessDenied.jsx";
import Inventory from "./pages/Inventory.jsx";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Helper function to get user role
    const getUserRole = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user?.role || 'user';
        } catch {
            return 'user';
        }
    };

    // Helper function to get default route based on role
    const getDefaultRoute = () => {
        const role = getUserRole();
        if (role === 'employee') return '/employee/dashboard';
        return role === 'product team' ? '/items' : '/';
    };

    // Check if user is logged in (token exists) and update state
    useEffect(() => {
        const checkAuth = () => {
            setIsAuthenticated(!!localStorage.getItem("token"));
        };

        // Check on initial load
        checkAuth();

        // Listen for storage changes (login/logout in other tabs)
        window.addEventListener('storage', checkAuth);

        // Custom event for same-tab auth changes
        window.addEventListener('authChange', checkAuth);

        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('authChange', checkAuth);
        };
    }, []);

    return (
        <Router>
            <Routes>
                {/* Protected Home Page */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            getUserRole() === 'product team' ? (
                                <Navigate to="/items" replace />
                            ) : getUserRole() === 'employee' ? (
                                <Navigate to="/employee/dashboard" replace />
                            ) : (
                                <Home />
                            )
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                {/* Home route for admin and user */}
                <Route
                    path="/home"
                    element={
                        isAuthenticated ? (
                            getUserRole() === 'product team' ? (
                                <Navigate to="/items" replace />
                            ) : (
                                <Home />
                            )
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                {/* Parties Page */}
                <Route
                    path="/parties"
                    element={
                        isAuthenticated ? <PartiesPage /> : <Navigate to="/login" replace />
                    }
                />

                {/* Login Page */}
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />
                    }
                />

                {/* Items Page */}
                <Route
                    path="/items"
                    element={
                        isAuthenticated ? <ItemPage /> : <Navigate to="/login" replace />
                    }
                />

                {/* Sale Invoice Page */}
                <Route
                    path="/sale/new"
                    element={
                        isAuthenticated ? <SaleInvoice /> : <Navigate to="/login" replace />
                    }
                />

                {/* Purchase Dashboard Page */}
                <Route
                    path="/purchase"
                    element={
                        isAuthenticated ? <Purchase /> : <Navigate to="/login" replace />
                    }
                />

                {/* Purchase Bill Entry Page */}
                <Route
                    path="/purchase/new"
                    element={
                        isAuthenticated ? <PurchaseBill /> : <Navigate to="/login" replace />
                    }
                />

                {/* --- Accounts Nested Routes (for Sidebar Persistence) --- */}

                {/* 1. Sales -> SaleInvoice */}
                <Route
                    path="/accounts/sales"
                    element={isAuthenticated ? <SaleInvoice /> : <Navigate to="/login" />}
                />

                {/* 2. Purchases -> Purchase Component (Dashboard) */}
                <Route
                    path="/accounts/purchases"
                    element={<Navigate to="/accounts/purchase-dashboard" replace />}
                />

                {/* 3. Purchase Dashboard -> Purchase Component */}
                <Route
                    path="/accounts/purchase-dashboard"
                    element={isAuthenticated ? <Purchase /> : <Navigate to="/login" />}
                />

                {/* 4. Purchase Bills -> PurchaseBill Component */}
                <Route
                    path="/accounts/purchase-bills"
                    element={isAuthenticated ? <PurchaseBill /> : <Navigate to="/login" />}
                />

                {/* 5. Accounts Report -> New Component */}
                <Route
                    path="/accounts/report"
                    element={isAuthenticated ? <AccountsReport /> : <Navigate to="/login" />}
                />



                {/* 6. Inventory -> Dedicated Component */}
                <Route
                    path="/accounts/inventory"
                    element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />}
                />

                {/* Manage Teams Page (Admin) */}
                <Route
                    path="/manage-teams"
                    element={
                        <ManageTeams />
                    }
                />

                {/* Accounts Team - Manage Teams */}
                <Route
                    path="/orders/teams"
                    element={
                        isAuthenticated && getUserRole() === 'accounts team'
                            ? <AccountsTeamManage />
                            : isAuthenticated
                                ? <Navigate to="/" replace />
                                : <Navigate to="/login" replace />
                    }
                />

                {/* Accounts Team - Manage Orders */}
                <Route
                    path="/orders/manage"
                    element={
                        isAuthenticated && getUserRole() === 'accounts team'
                            ? <ManageOrders />
                            : isAuthenticated
                                ? <AccessDenied />
                                : <Navigate to="/login" replace />
                    }
                />

                {/* Accounts Dashboard - NEW */}
                <Route
                    path="/accounts/dashboard"
                    element={
                        isAuthenticated && (getUserRole() === 'accounts team' || getUserRole() === 'admin')
                            ? <AccountsDashboard />
                            : isAuthenticated
                                ? <AccessDenied />
                                : <Navigate to="/login" replace />
                    }
                />

                {/* Settings Page */}
                <Route
                    path="/settings"
                    element={
                        isAuthenticated ? <Settings /> : <Navigate to="/login" replace />
                    }
                />

                {/* Order Calendar - visible to all authenticated roles */}
                <Route
                    path="/calendar"
                    element={
                        isAuthenticated ? <OrderCalendar /> : <Navigate to="/login" replace />
                    }
                />

                {/* Order Dashboard */}
                <Route
                    path="/orders"
                    element={isAuthenticated ? <OrderDashboard /> : <Navigate to="/login" />}
                />

                {/* Create Order Page - NEW ROUTE */}
                <Route
                    path="/orders/new"
                    element={isAuthenticated ? <CreateOrder /> : <Navigate to="/login" />}
                />

                {/* Sale Report */}
                <Route
                    path="/sales/report/:id"
                    element={isAuthenticated ? <SaleReport /> : <Navigate to="/login" />}
                />

                {/* Purchase Report */}
                <Route
                    path="/purchases/report/:id"
                    element={isAuthenticated ? <PurchaseReport /> : <Navigate to="/login" />}
                />

                {/* Employee Dashboard */}
                <Route
                    path="/employee/dashboard"
                    element={
                        <EmployeeDashboard />
                    }
                />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </Router>
    );
}

export default App;
