import { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/overview").then(res => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>📊 Admin Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <div>Users: {data.total_users}</div>
        <div>Tasks: {data.total_tasks}</div>
        <div>Transactions: {data.total_transactions}</div>
        <div>Balance: {data.total_user_balance}</div>
        <div>Withdrawals: {data.pending_withdrawals}</div>
        <div>Fraud Cases: {data.open_fraud_cases}</div>
      </div>
    </div>
  );
}
