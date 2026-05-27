"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../client/src/_core/hooks/useAuth";
import WorkerWorkspace from "../../client/src/pages/WorkerWorkspace";
import { Loader2 } from "lucide-react";

export default function WorkerPage({ params }: { params: Promise<{ worker: string }> }) {
  const resolvedParams = use(params);
  const workerUsername = resolvedParams.worker;

  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }

    if (user.username !== workerUsername) {
      router.replace(`/${user.username}`);
      return;
    }

    setReady(true);
  }, [loading, user, workerUsername, router]);

  if (workerUsername === "admin" || workerUsername === "login") {
    return null;
  }

  if (!ready || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm text-zinc-500 animate-pulse">Loading Worker Workspace ({workerUsername})...</p>
        </div>
      </div>
    );
  }

  return <WorkerWorkspace user={user} />;
}
