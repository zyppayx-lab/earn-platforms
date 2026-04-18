import { useEffect, useState } from "react";
import API from "../api";

export default function Fraud() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get("/fraud").then(res => setData(res.data));
  }, []);

  return (
    <div>
      <h2>🚨 Fraud Monitoring</h2>

      {data.map(f => (
        <div key={f.id} style={{ border: "1px solid red", margin: 10 }}>
          <p>User: {f.user_id}</p>
          <p>Reason: {f.reason}</p>
          <p>Severity: {f.severity}</p>
        </div>
      ))}
    </div>
  );
}
