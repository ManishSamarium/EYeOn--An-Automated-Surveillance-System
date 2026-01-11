import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { connectSocket, disconnectSocket } from "./services/websocket";

// Pages
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import AddFamilyPage from "./pages/AddFamilyPage";
import FamilyPage from "./pages/FamilyPage";
import CategoriesPage from "./pages/CategoriesPage";
import SurveillancePage from "./pages/SurveillancePage";
import UnknownPage from "./pages/UnknownPage";
import NotificationPage from "./pages/NotificationPage";

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-family"
          element={
            <ProtectedRoute>
              <AddFamilyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family"
          element={
            <ProtectedRoute>
              <FamilyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/surveillance"
          element={
            <ProtectedRoute>
              <SurveillancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/unknown"
          element={
            <ProtectedRoute>
              <UnknownPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            localStorage.getItem("token") ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
