import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF5EF]" data-testid="auth-loading">
        <Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
