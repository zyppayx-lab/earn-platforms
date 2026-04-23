import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const role = localStorage.getItem("role");

  const isActive = (path) => location.pathname === path;

  const navStyle = (path) => ({
    padding: "8px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    color: isActive(path) ? "#000" : "#fff",
    background: isActive(path) ? "#fff" : "transparent"
  });

  const isAdmin = ["admin", "super_admin", "finance_admin", "fraud_admin"].includes(role);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        padding: "12px",
        background: "#111",
        color: "#fff",
        alignItems: "center"
      }}
    >
      {/* USER */}
      <Link to="/dashboard" style={navStyle("/dashboard")}>
        Dashboard
      </Link>

      <Link to="/tasks" style={navStyle("/tasks")}>
        Tasks
      </Link>

      {/* ADMIN SECTION */}
      {isAdmin && (
        <>
          <div style={{ marginLeft: "10px", opacity: 0.6 }}>Admin:</div>

          <Link to="/admin" style={navStyle("/admin")}>
            Overview
          </Link>

          <Link to="/admin/users" style={navStyle("/admin/users")}>
            Users
          </Link>

          <Link to="/admin/finance" style={navStyle("/admin/finance")}>
            Finance
          </Link>

          <Link to="/admin/fraud" style={navStyle("/admin/fraud")}>
            Fraud
          </Link>
        </>
      )}
    </div>
  );
}
