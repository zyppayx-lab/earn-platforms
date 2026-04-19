import { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    API.get("/wallet/balance").then(res => {
      setBalance(res.data.balance);
    });
  }, []);

  return (
    <div>
      <h2>User Dashboard</h2>
      <p>Balance: ₦{balance}</p>
    </div>
  );
}
