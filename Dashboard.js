import { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [data, setData] = useState(null);

  const fetchData = () => {
    API.get("/overview").then(res => setData(res.data));
  };

  useEffect(() => {
    fetchData();

    // 🔴 REAL-TIME STREAM
    const eventSource = new EventSource(
      "https://trivexapay.onrender.com/realtime/events"
    );

    eventSource.onmessage = (event) => {
      console.log("🔴 Live update:", event.data);
      fetchData(); // refresh dashboard
    };

    eventSource.onerror = () => {
      console.log("Connection lost, retrying...");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  if (!data) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>📊 Live Admin Dashboard</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "15px"
      }}>
        <div>👥 Users: {data.total_users}</div>
        <div>🧩 Tasks: {data.total_tasks}</div>
        <div>💳 Transactions: {data.total_transactions}</div>
        <div>💰 Balance: ₦{data.total_user_balance}</div>
        <div>💸 Withdrawals: {data.pending_withdrawals}</div>
        <div>🚨 Fraud Cases: {data.open_fraud_cases}</div>
      </div>
    </div>
  );
}
