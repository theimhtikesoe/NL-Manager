import { useCallback, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "worker";
};

export function useAuth() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const user = useMemo(() => {
    if (typeof window === "undefined" || !isMounted) return null;
    
    // Read the real user session from localStorage
    const storedUser = localStorage.getItem("nl_user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as AuthUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [isMounted]);

  const logout = useCallback(() => {
    localStorage.removeItem("nl_user");
    localStorage.removeItem("nl_token");
    localStorage.removeItem("nl_mock_user"); // Legacy cleanup
    window.location.href = "/login";
  }, []);

  return {
    user,
    loading: !isMounted,
    error: null,
    isAuthenticated: Boolean(user),
    logout,
  };
}
