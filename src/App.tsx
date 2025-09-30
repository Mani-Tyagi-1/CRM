import {  Routes, Route, useLocation,} from "react-router-dom";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Calender from "./components/pages/Calender";
import ProtectedRoute from "./components/ProtectedRoute";
import AllContracts from "./components/pages/AllContracts";
import Dashboard from "./components/pages/Dashboard";
import AddContract from "./components/pages/AddContract";
import MachineryPreview from "./components/pages/MachineryPreview"
import Modal from "./components/Modal";
import EmployeePreview from "./components/pages/EmployePreview";
import ContractPreview from "./components/pages/ContractPreview";


export default function App() {
  const location = useLocation();
  // This enables the modal pattern
  const state = location.state as { backgroundLocation?: Location };
  return (
    <>
      <Routes location={state?.backgroundLocation || location}>
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

        <Route
          path="/machine-preview/:category/:id"
          element={
            <ProtectedRoute>
              <MachineryPreview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee-preview/:category/:id"
          element={
            <ProtectedRoute>
              <EmployeePreview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contract-preview/:id"
          element={
            <ProtectedRoute>
              <ContractPreview />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/add-contract"
          element={
            <ProtectedRoute>
              <Modal>
                <AddContract />
              </Modal>
            </ProtectedRoute>
          }
        /> */}

        {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
      </Routes>

      {state?.backgroundLocation && (
        <Routes>
          <Route
            path="/add-contract"
            element={
              <ProtectedRoute>
                <Modal>
                  <AddContract />
                </Modal>
              </ProtectedRoute>
            }
          />
        </Routes>
      )}
    </>
  );
}