import {  Routes, Route,} from "react-router-dom";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Dashboard from "./components/pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AllContracts from "./components/pages/AllContracts";

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <ProtectedRoute>
            <AllContracts />
          </ProtectedRoute>
        }
      />
      {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
    </Routes>
  );
}