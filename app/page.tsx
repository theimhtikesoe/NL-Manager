"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const mockUser = localStorage.getItem("nl_mock_user");
    if (!mockUser) {
      localStorage.setItem("nl_mock_user", "admin");
      router.replace("/admin");
      return;
    }
    if (mockUser === "admin") {
      router.replace("/admin");
    } else {
      router.replace(`/${mockUser}`);
    }
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-sm text-zinc-500 animate-pulse">Redirecting to workspace...</p>
      </div>
    </div>
  );
}
