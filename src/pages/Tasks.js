import { useEffect, useState } from "react";
import API from "../api";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    API.get("/tasks").then(res => {
      setTasks(res.data);
    });
  }, []);

  return (
    <div>
      <h2>Tasks</h2>

      {tasks.map(t => (
        <div key={t.id}>
          <p>{t.title}</p>
          <p>₦{t.reward}</p>
        </div>
      ))}
    </div>
  );
                 }
