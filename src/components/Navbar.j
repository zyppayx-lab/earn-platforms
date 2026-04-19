import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div style={{
      display: "flex",
      gap: "15px",
      padding: "10px",
      background: "#111",
      color: "#fff"
    }}>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/tasks">Tasks</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/admin/finance">Finance</Link>
      <Link to="/admin/fraud">Fraud</Link>
      <Link to="/admin/users">Users</Link>
    </div>
  );
}
