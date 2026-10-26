import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { getCitizenRouteDecision } from "../lib/roleNavigation";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-shell"><p role="status">Checking your sign-in…</p></div>;
  const decision = getCitizenRouteDecision(user?.roles ?? null);
  if (decision === "sign-in") return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  if (decision === "admin-dashboard") return <Navigate to="/admin" replace />;
  return children;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-shell"><p role="status">Checking your access…</p></div>;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: "/admin" }} />;
  if (!user.roles.includes("Admin")) return <Navigate to="/" replace />;
  return children;
}
