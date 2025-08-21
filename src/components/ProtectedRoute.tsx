import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { JSX } from "react/jsx-runtime";

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
