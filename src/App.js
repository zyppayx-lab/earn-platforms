import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Finance from "./pages/Finance";
import Fraud from "./pages/Fraud";
import Tasks from "./pages/Tasks";
import Escrow from "./pages/Escrow";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex" }}>
        
        <Sidebar />

        <div style={{ flex: 1, padding: 20 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/fraud" element={<Fraud />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/escrow" element={<Escrow />} />
          </Routes>
        </div>

      </div>
    </BrowserRouter>
  );
  }
