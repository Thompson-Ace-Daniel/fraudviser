import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#f7f8f4] text-sm font-medium text-slate-500">Loading your workspace…</main>;
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
