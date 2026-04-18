import { useEffect, useState } from "react";
import API from "../api";

export default function Finance() {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/finance").then(res => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>💸 Finance</h2>

      <p>Deposits: {data.total_deposits}</p>
      <p>Payouts: {data.total_payouts}</p>
      <p>Referrals: {data.referral_bonuses}</p>
      <p>Escrow: {data.escrow_locked}</p>
      <p>Profit: {data.platform_profit}</p>
    </div>
  );
}
