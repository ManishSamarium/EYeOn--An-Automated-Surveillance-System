import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { connectSocket, disconnectSocket } from "./services/websocket";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import AddFamilyPage from "./pages/AddFamilyPage";
import FamilyPage from "./pages/FamilyPage";
import CategoriesPage from "./pages/CategoriesPage";
import SurveillancePage from "./pages/SurveillancePage";
import UnknownPage from "./pages/UnknownPage";
import NotificationsPage from "./pages/NotificationsPage";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) connectSocket();
    return () => disconnectSocket();
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
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate
              to={localStorage.getItem("token") ? "/dashboard" : "/login"}
              replace
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
