import { useEffect, useState } from "react";
import API from "../api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  const load = async () => {
    const res = await API.get("/dashboard/overview");
    setData(res.data);
  };

  useEffect(() => {
    load();

    // 🔴 REAL-TIME
    const es = new EventSource(
      "https://trivexapay.onrender.com/realtime/events"
    );

    es.onmessage = () => {
      load();
    };

    return () => es.close();
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>

      <p>Users: {data.total_users}</p>
      <p>Tasks: {data.total_tasks}</p>
      <p>Transactions: {data.total_transactions}</p>
      <p>Balance: ₦{data.total_user_balance}</p>
      <p>Pending Withdrawals: {data.pending_withdrawals}</p>
      <p>Fraud Cases: {data.open_fraud_cases}</p>
    </div>
  );
}
