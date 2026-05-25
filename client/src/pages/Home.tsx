import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    if (user?.role === "admin") {
      setLocation("/admin/dashboard");
    } else {
      setLocation("/worker/workspace");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  );
}
