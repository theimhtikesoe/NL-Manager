import { useCallback, useEffect, useMemo, useState } from "react";

export type MockUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "worker";
};

// ── Mock user definitions ───────────────────────────────
// These are used to immediately resolve the user on the client
// without waiting for a server round-trip. The server still
// validates via the x-mock-user header + DB lookup.
const MOCK_USERS: Record<string, MockUser> = {
  admin: { id: 1, username: "admin", name: "System Admin", role: "admin" },
  worker01: { id: 2, username: "worker01", name: "Ahmad Rizal", role: "worker" },
  worker02: { id: 3, username: "worker02", name: "Budi Santoso", role: "worker" },
  worker03: { id: 4, username: "worker03", name: "Citra Dewi", role: "worker" },
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const mockUsername = useMemo(() => {
    if (typeof window === "undefined" || !isMounted) return null;
    return localStorage.getItem("nl_mock_user");
  }, [isMounted]);

  const user = useMemo(() => {
    if (!mockUsername) return null;
    return MOCK_USERS[mockUsername] ?? {
      id: 100,
      username: mockUsername,
      name: mockUsername,
      role: "worker" as const,
    };
  }, [mockUsername]);

  const setMockUser = useCallback((username: string) => {
    localStorage.setItem("nl_mock_user", username);
    // Force full reload to re-initialize tRPC client headers
    window.location.reload();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nl_mock_user");
    localStorage.removeItem("nl_token");
    window.location.href = "/";
  }, []);

  return {
    user,
    loading: !isMounted,
    error: null,
    isAuthenticated: Boolean(user),
    setMockUser,
    logout,
    refresh: () => {},
  };
}
