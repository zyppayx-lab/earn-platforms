import { Link } from "react-router-dom";
import jwt_decode from "jwt-decode";

export default function Sidebar() {
  const token = localStorage.getItem("token");

  let role = null;

  try {
    if (token) {
      const decoded = jwt_decode(token);
      role = decoded.role;
    }
  } catch (err) {
    role = null;
  }

  const canFinance = ["finance_admin", "super_admin"].includes(role);
  const canFraud = ["fraud_admin", "super_admin"].includes(role);
  const canUsers = ["admin", "super_admin"].includes(role);
  const canAnalytics = ["analytics_admin", "super_admin"].includes(role);

  return (
    <div style={styles.sidebar}>
      <h3 style={{ color: "#00ffcc" }}>💰 Trivexa Admin</h3>

      {/* COMMON */}
      <Link style={linkStyle} to="/admin">📊 Dashboard</Link>
      <Link style={linkStyle} to="/tasks">🧩 Tasks</Link>

      {/* FINANCE */}
      {canFinance && (
        <Link style={linkStyle} to="/admin/finance">💸 Finance</Link>
      )}

      {/* FRAUD */}
      {canFraud && (
        <Link style={linkStyle} to="/admin/fraud">🚨 Fraud</Link>
      )}

      {/* USERS */}
      {canUsers && (
        <Link style={linkStyle} to="/admin/users">👥 Users</Link>
      )}

      {/* ANALYTICS */}
      {canAnalytics && (
        <Link style={linkStyle} to="/admin/analytics">📈 Analytics</Link>
      )}

      <hr style={{ width: "100%", opacity: 0.2 }} />

      <Link style={linkStyle} to="/dashboard">🏠 User App</Link>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 220,
    height: "100vh",
    background: "#0f0f0f",
    color: "#fff",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  }
};

const linkStyle = {
  color: "#ccc",
  textDecoration: "none",
  padding: "6px 0",
  fontSize: "14px"
};
