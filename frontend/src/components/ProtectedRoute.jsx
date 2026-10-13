import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="ce-spin min-h-screen items-center" data-testid="auth-loading">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
