import {  Routes, Route,} from "react-router-dom";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Calender from "./components/pages/Calender";
import ProtectedRoute from "./components/ProtectedRoute";
import AllContracts from "./components/pages/AllContracts";
import Dashboard from "./components/pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Login />} />
      <Route
        path="/calender"
        element={
          <ProtectedRoute>
            <Calender />
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

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
    </Routes>
  );
}