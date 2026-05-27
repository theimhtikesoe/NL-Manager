"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const userJson = localStorage.getItem("nl_user");
    if (!userJson) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(userJson);
      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace(`/${user.username}`);
      }
    } catch (e) {
      router.replace("/login");
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
