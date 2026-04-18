import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div style={{ width: 200, height: "100vh", background: "#111", color: "#fff", padding: 20 }}>
      <h3>Trivexa Admin</h3>

      <Link to="/">Dashboard</Link><br />
      <Link to="/users">Users</Link><br />
      <Link to="/finance">Finance</Link><br />
      <Link to="/tasks">Tasks</Link><br />
      <Link to="/fraud">Fraud</Link>
    </div>
  );
}
