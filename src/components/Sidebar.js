import { Link } from "react-router-dom";

export default function Sidebar() {
  const role = localStorage.getItem("role");

  return (
    <div style={{
      width: 220,
      height: "100vh",
      background: "#0f0f0f",
      color: "#fff",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    }}>
      <h3 style={{ color: "#00ffcc" }}>💰 Trivexa Admin</h3>

      {/* COMMON */}
      <Link style={linkStyle} to="/admin">📊 Dashboard</Link>
      <Link style={linkStyle} to="/tasks">🧩 Tasks</Link>

      {/* FINANCE ACCESS */}
      {(role === "finance_admin" || role === "super_admin") && (
        <Link style={linkStyle} to="/admin/finance">💸 Finance</Link>
      )}

      {/* FRAUD ACCESS */}
      {(role === "fraud_admin" || role === "super_admin") && (
        <Link style={linkStyle} to="/admin/fraud">🚨 Fraud</Link>
      )}

      {/* USER MANAGEMENT */}
      {(role === "super_admin" || role === "admin") && (
        <Link style={linkStyle} to="/admin/users">👥 Users</Link>
      )}

      {/* ANALYTICS */}
      {(role === "analytics_admin" || role === "super_admin") && (
        <Link style={linkStyle} to="/admin/analytics">📈 Analytics</Link>
      )}

      <hr style={{ width: "100%", opacity: 0.2 }} />

      <Link style={linkStyle} to="/dashboard">🏠 User App</Link>
    </div>
  );
}

const linkStyle = {
  color: "#ccc",
  textDecoration: "none",
  padding: "6px 0",
  fontSize: "14px"
};
