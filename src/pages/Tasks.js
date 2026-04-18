import { useEffect, useState } from "react";
import API from "../api";

export default function Tasks() {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/tasks").then(res => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>🧩 Tasks</h2>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
