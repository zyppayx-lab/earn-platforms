import { useEffect, useState } from "react";
import API from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    API.get("/users").then(res => setUsers(res.data));
  }, []);

  const suspendUser = async (id) => {
    await API.post("/suspend-user", { userId: id });
    alert("User suspended");
  };

  return (
    <div>
      <h2>👥 Users</h2>

      {users.map(u => (
        <div key={u.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          <p>{u.email}</p>
          <p>Balance: {u.balance}</p>
          <p>Fraud Score: {u.fraud_score}</p>
          <button onClick={() => suspendUser(u.id)}>Suspend</button>
        </div>
      ))}
    </div>
  );
}
