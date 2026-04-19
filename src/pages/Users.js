import { useEffect, useState } from "react";
import API from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);

  const load = () => {
    API.get("/admin/users")
      .then(res => setUsers(res.data))
      .catch(() => alert("No access"));
  };

  const suspendUser = async (id) => {
    await API.post("/admin/suspend-user", { user_id: id });
    load();
  };

  const freezeUser = async (id) => {
    await API.post("/admin/freeze-user", { user_id: id });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2>👥 User Management</h2>

      {users.map((u) => (
        <div key={u.id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <p>Email: {u.email}</p>
          <p>Balance: ₦{u.balance}</p>
          <p>Status: {u.status}</p>

          <button onClick={() => suspendUser(u.id)}>
            Suspend
          </button>

          <button onClick={() => freezeUser(u.id)}>
            Freeze
          </button>
        </div>
      ))}
    </div>
  );
    }
