"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../client/src/_core/hooks/useAuth";
import AdminDashboard from "../../client/src/pages/AdminDashboard";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = localStorage.getItem("nl_mock_user");
    if (current !== "admin") {
      localStorage.setItem("nl_mock_user", "admin");
      window.location.reload();
      return;
    }
    setReady(true);
  }, []);

  if (!ready || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-zinc-500 animate-pulse">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return <AdminDashboard user={user} />;
}
