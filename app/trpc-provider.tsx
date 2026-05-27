"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { trpc } from "../client/src/lib/trpc";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: (failureCount, error) => {
              if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "/api/trpc",
          headers() {
            if (typeof window === "undefined") return {};
            const headers: Record<string, string> = {};
            const mockUser = localStorage.getItem("nl_mock_user");
            if (mockUser) {
              headers["x-mock-user"] = mockUser;
            }
            const token = localStorage.getItem("nl_token");
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            return headers;
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
