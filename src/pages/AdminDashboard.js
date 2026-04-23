import { useEffect, useState, useCallback } from "react";
import API from "../api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================
  // FETCH OVERVIEW DATA
  // ======================
  const load = useCallback(async () => {
    try {
      setError(null);

      const res = await API.get("/dashboard/overview");
      setData(res.data);

    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // ======================
    // REAL-TIME STREAM (SSE)
    // ======================
    const es = new EventSource(
      "https://trivexapay.onrender.com/realtime/events"
    );

    let refreshTimeout;

    const scheduleRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        load();
      }, 1000); // debounce rapid events
    };

    es.onmessage = () => {
      scheduleRefresh();
    };

    es.onerror = () => {
      // silent reconnect (browser auto-reconnects)
      console.warn("SSE disconnected, retrying...");
    };

    return () => {
      clearTimeout(refreshTimeout);
      es.close();
    };
  }, [load]);

  // ======================
  // UI STATES
  // ======================
  if (loading) return <p>Loading dashboard...</p>;

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  if (!data) return <p>No data available</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Admin Control Center</h2>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, 1fr)" }}>
        <p>👥 Users: {data.total_users}</p>
        <p>🧩 Tasks: {data.total_tasks}</p>
        <p>💳 Transactions: {data.total_transactions}</p>
        <p>💰 Balance: ₦{data.total_user_balance}</p>
        <p>⏳ Pending Withdrawals: {data.pending_withdrawals}</p>
        <p>🚨 Fraud Cases: {data.open_fraud_cases}</p>
      </div>
    </div>
  );
               }
