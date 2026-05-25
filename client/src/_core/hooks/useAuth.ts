import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";
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

  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("nl_token"));

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: hasToken,
  });

  const logout = useCallback(async () => {
    localStorage.removeItem("nl_token");
    localStorage.removeItem("worker_info");
    utils.auth.me.setData(undefined, undefined);
    await utils.auth.me.invalidate();
    setLocation("/login");
  }, [utils, setLocation]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: hasToken && meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [meQuery.data, meQuery.error, meQuery.isLoading, hasToken]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    setLocation(redirectPath);
  }, [
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
