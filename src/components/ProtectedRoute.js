import { Navigate } from "react-router-dom";
import jwt_decode from "jwt-decode";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" />;
  }

  try {
    const user = jwt_decode(token);

    // ======================
    // TOKEN EXPIRY CHECK
    // ======================
    if (user.exp * 1000 < Date.now()) {
      localStorage.clear();
      return <Navigate to="/" />;
    }

    const role = localStorage.getItem("role");
    const status = localStorage.getItem("status"); // store this at login

    // ======================
    // ACCOUNT SAFETY CHECKS
    // ======================
    if (status === "frozen") {
      return <Navigate to="/frozen-account" />;
    }

    if (status === "suspended") {
      return <Navigate to="/suspended" />;
    }

    // ======================
    // ROLE CHECK (if required)
    // ======================
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" />;
    }

    return children;

  } catch (err) {
    localStorage.clear();
    return <Navigate to="/" />;
  }
    }
