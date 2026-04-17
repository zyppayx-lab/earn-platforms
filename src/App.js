import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Finance from "./pages/Finance";
import Tasks from "./pages/Tasks";
import Fraud from "./pages/Fraud";
import Sidebar from "./components/Sidebar";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <div style={{ padding: 20, width: "100%" }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/fraud" element={<Fraud />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
