import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import ItemPage from "./pages/item.jsx";
import SaleInvoice from "./pages/SaleInvoice.jsx";
import Purchase from "./pages/Purchase.jsx";
import PurchaseBill from "./pages/PurchaseBill.jsx";
import PartiesPage from "./pages/Parties.jsx";
import Settings from "./pages/Settings.jsx";
import OrderDashboard from "./pages/OrderDashboard.jsx";
import CreateOrder from "./pages/CreateOrder.jsx"; // Import the new page
import ManageTeams from "./pages/ManageTeams.jsx";

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
        
        {/* NEW: Purchase Dashboard Page */}
        <Route
          path="/purchase"
          element={
            isAuthenticated ? <Purchase /> : <Navigate to="/login" replace />
          }
        />
        
        {/* NEW: Purchase Bill Entry Page */}
        <Route
          path="/purchase/new"
          element={
            isAuthenticated ? <PurchaseBill /> : <Navigate to="/login" replace />
          }
        />

        {/* Manage Teams Page */}
        <Route
          path="/manage-teams"
          element={
            isAuthenticated ? <ManageTeams /> : <Navigate to="/login" replace />
          }
        />

        {/* Settings Page */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? <Settings /> : <Navigate to="/login" replace />
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

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
        
      </Routes>
    </Router>
  );
}

export default App;
