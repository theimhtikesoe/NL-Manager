"use client";

import { useEffect, useState } from "react";
import { TRPCProvider } from "./trpc-provider";
import { TooltipProvider } from "../client/src/components/ui/tooltip";
import { Toaster } from "sonner";

// Custom inline ThemeProvider to ensure SSR safety and avoid import issues
import { createContext, useContext } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme }>({ theme: "dark" });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <TRPCProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "rgb(24 24 27)",
                border: "1px solid rgb(39 39 42)",
                color: "rgb(228 228 231)",
              },
            }}
          />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}
