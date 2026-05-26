import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") return false;
        return failureCount < 2;
      },
    },
  },
});

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        if (typeof window === "undefined") return {};
        const headers: Record<string, string> = {};

        // ── Mock user header for development mode ───────
        // The active mock user is stored in localStorage.
        // This header is read by the server context to resolve
        // the user without JWT authentication.
        const mockUser = localStorage.getItem("nl_mock_user");
        if (mockUser) {
          headers["x-mock-user"] = mockUser;
        }

        // ── Standard JWT auth (for when auth is re-enabled) ─
        const token = localStorage.getItem("nl_token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
      },
    }),
  ],
});

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
