import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";

import AdminDashboard from "./pages/AdminDashboard";
import Finance from "./pages/Finance";
import Fraud from "./pages/Fraud";
import Users from "./pages/Users";

// ======================
// 🔐 PROTECTED ROUTE
// ======================
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  return token ? children : <Navigate to="/" />;
};

// ======================
// 👑 ADMIN ROUTE
// ======================
const AdminRoute = ({ children }) => {
  const role = localStorage.getItem("role"); // optional (if you store it)

  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" />;

  // simple check (backend still enforces real security)
  if (!role || role === "user") {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// ======================
// APP
// ======================
function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Login />} />

        {/* USER */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/finance"
          element={
            <AdminRoute>
              <Finance />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/fraud"
          element={
            <AdminRoute>
              <Fraud />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </Router>
  );
}

export default App;
