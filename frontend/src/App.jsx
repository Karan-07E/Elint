import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import ItemPage from "./pages/item.jsx";
import PartiesPage from "./pages/Parties.jsx";
import Settings from "./pages/Settings.jsx";

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

        {/* Signup Page */}
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Signup />
          }
        />

        {/* Items Page */}
        <Route
          path="/items"
          element={
            isAuthenticated ? <ItemPage /> : <Navigate to="/login" replace />
          }
        />

        {/* Settings Page */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? <Settings /> : <Navigate to="/login" replace />
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
