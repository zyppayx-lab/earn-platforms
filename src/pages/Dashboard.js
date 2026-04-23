import { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  const load = async () => {
    const [balRes, txRes] = await Promise.all([
      API.get("/wallet/balance"),
      API.get("/wallet/transactions")
    ]);

    setBalance(balRes.data.balance);
    setTransactions(txRes.data);
  };

  useEffect(() => {
    load();

    // real-time updates (SSE)
    const es = new EventSource(
      "https://trivexapay.onrender.com/realtime/events"
    );

    es.onmessage = () => {
      load();
    };

    return () => es.close();
  }, []);

  return (
    <div>
      <h2>User Dashboard</h2>

      <h3>Balance: ₦{balance}</h3>

      <h4>Recent Transactions</h4>
      {transactions.map((t) => (
        <div key={t.id}>
          {t.type} - ₦{t.amount}
        </div>
      ))}
    </div>
  );
        }
