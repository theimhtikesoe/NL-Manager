import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
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

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  
  // Production-safe transport error logging
  if (error.message === "Failed to fetch" || error.message.toLowerCase().includes("network")) {
    console.error("[tRPC Transport Error]: Connection failed. Verify API endpoint and network status.", {
      message: error.message,
      url: getBaseUrl(),
      timestamp: new Date().toISOString()
    });
  }

  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (window.location.pathname === "/login") return;

  console.warn("[Auth] Unauthorized access detected, clearing session and redirecting...");
  localStorage.removeItem("nl_token");
  localStorage.removeItem("worker_info");
  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        if (typeof window === "undefined") return {};
        const token = localStorage.getItem("nl_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
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
