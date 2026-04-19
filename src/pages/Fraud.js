import { useEffect, useState } from "react";
import API from "../api";

export default function Fraud() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    API.get("/admin/fraud")
      .then(res => setCases(res.data))
      .catch(() => alert("No access"));
  }, []);

  return (
    <div>
      <h2>🚨 Fraud Monitoring</h2>

      {cases.length === 0 && <p>No fraud cases</p>}

      {cases.map((c) => (
        <div key={c.id} style={{ border: "1px solid red", margin: "10px", padding: "10px" }}>
          <p>User: {c.user_id}</p>
          <p>Reason: {c.reason}</p>
          <p>Status: {c.status}</p>
        </div>
      ))}
    </div>
  );
        }
