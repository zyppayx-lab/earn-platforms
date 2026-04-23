import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    const role = decoded.role;
    const exp = decoded.exp * 1000;

    // ======================
    // TOKEN EXPIRY CHECK
    // ======================
    if (Date.now() > exp) {
      localStorage.clear();
      return <Navigate to="/" replace />;
    }

    // ======================
    // ROLE CHECK (ADMIN ONLY)
    // ======================
    const adminRoles = [
      "admin",
      "super_admin",
      "finance_admin",
      "fraud_admin",
      "analytics_admin"
    ];

    if (!adminRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }

    return children;

  } catch (err) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
}
