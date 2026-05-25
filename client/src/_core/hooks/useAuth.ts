import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  // Track hydration state to prevent mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasToken = useMemo(() => {
    if (typeof window === "undefined" || !isMounted) return false;
    try {
      return Boolean(localStorage.getItem("nl_token"));
    } catch {
      return false;
    }
  }, [isMounted]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    enabled: hasToken && isMounted,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nl_token");
      localStorage.removeItem("worker_info");
    }
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
    setLocation("/login");
  }, [utils, setLocation]);

  // TODO: Authentication temporarily disabled during workflow development
  const isAuthDisabled = false; // Enable authentication by default

  const state = useMemo(
    () => {
      if (isAuthDisabled && isMounted) {
        return {
          user: {
            id: 0,
            workerCode: "dev-admin",
            name: "Admin (Dev Mode)",
            role: "admin" as const,
          },
          loading: false,
          error: null,
          isAuthenticated: true,
        };
      }
      return {
        user: meQuery.data ?? null,
        loading: isMounted ? (hasToken && meQuery.isLoading) : true,
        error: meQuery.error ?? null,
        isAuthenticated: Boolean(meQuery.data),
      };
    },
    [meQuery.data, meQuery.error, meQuery.isLoading, hasToken, isMounted, isAuthDisabled]
  );

  useEffect(() => {
    if (!isMounted || !redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.isAuthenticated) return;
    
    const currentPath = window.location.pathname;
    if (currentPath === redirectPath) return;
    
    console.warn(`[Auth] Unauthenticated user on protected route ${currentPath}, redirecting to ${redirectPath}`);
    setLocation(redirectPath);
  }, [
    isMounted,
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.isAuthenticated,
    setLocation,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
