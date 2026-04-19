import { useEffect, useState } from "react";
import API from "../api";

export default function Finance() {
  const [data, setData] = useState({});

  useEffect(() => {
    API.get("/admin/finance")
      .then(res => setData(res.data))
      .catch(() => alert("No access"));
  }, []);

  return (
    <div>
      <h2>💸 Finance Dashboard</h2>

      <p>Total Deposits: ₦{data.deposits || 0}</p>
      <p>Total Withdrawals: ₦{data.withdrawals || 0}</p>
      <p>Revenue: ₦{data.revenue || 0}</p>
    </div>
  );
    }
