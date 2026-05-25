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
    queries: { staleTime: 10_000, retry: 1 },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) {
    console.error("Non-TRPCClientError:", error);
    return;
  }
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) {
    console.error("TRPCClientError (not unauthed):\
  if (window.location.pathname === "/login") return;
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
      url: `${window.location.origin}/api/trpc`,
      headers() {
        const token = localStorage.getItem("nl_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
