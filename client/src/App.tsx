import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2, Shield, Wrench, Users, ChevronUp, ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useState, useCallback } from "react";

// ── Lazy-loaded pages for bundle splitting ──────────────
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const WorkerWorkspace = lazy(() => import("./pages/WorkerWorkspace"));

// ── Loading fallback ────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-sm text-zinc-500 animate-pulse">Loading module...</p>
      </div>
    </div>
  );
}

// ── Route wrapper: simplified for no-auth ───────────────
function DirectRoute({
  username,
  component: Component,
}: {
  username: string;
  component: React.LazyExoticComponent<React.ComponentType<{ user: any }>>;
}) {
  const { user, setMockUser } = useAuth();
  
  useEffect(() => {
    const current = localStorage.getItem("nl_mock_user");
    if (current !== username) {
      localStorage.setItem("nl_mock_user", username);
      window.location.reload();
    }
  }, [username]);

  if (!user) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Component user={user} />
    </Suspense>
  );
}

// ── Home redirect ───────────────────────────────────────
function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const mockUser = localStorage.getItem("nl_mock_user") || "admin";
    if (!localStorage.getItem("nl_mock_user")) {
      localStorage.setItem("nl_mock_user", "admin");
    }
    setLocation(mockUser === "admin" ? "/admin" : `/${mockUser}`);
  }, [setLocation]);

  return <PageLoader />;
}

// ── Dev role switcher widget ────────────────────────────
function DevRoleSwitcher() {
  const { user, setMockUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { username: "admin", label: "Admin", icon: Shield, color: "text-orange-400" },
    { username: "worker01", label: "Worker 01", icon: Wrench, color: "text-cyan-400" },
    { username: "worker02", label: "Worker 02", icon: Wrench, color: "text-emerald-400" },
    { username: "worker03", label: "Worker 03", icon: Users, color: "text-violet-400" },
  ];

  const handleSwitch = useCallback(
    (username: string) => {
      if (user?.username === username) return;
      setMockUser(username);
    },
    [user, setMockUser]
  );

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {isOpen && (
        <div className="mb-2 flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {roles.map((r) => {
            const isActive = user?.username === r.username;
            return (
              <button
                key={r.username}
                onClick={() => handleSwitch(r.username)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-all
                  ${
                    isActive
                      ? "bg-orange-500 text-zinc-950 shadow-orange-500/25"
                      : "bg-zinc-800/95 text-zinc-300 hover:bg-zinc-700 backdrop-blur-sm border border-zinc-700/50"
                  }`}
              >
                <r.icon className={`h-4 w-4 ${isActive ? "text-zinc-950" : r.color}`} />
                {r.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 px-4 py-2.5 text-sm font-medium text-zinc-300 shadow-xl hover:bg-zinc-700 transition-all"
      >
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-zinc-500">Dev</span>
        <span className="text-zinc-200">{user?.name ?? "..."}</span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
        )}
      </button>
    </div>
  );
}

// ── Router ──────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin">
        <DirectRoute username="admin" component={AdminDashboard} />
      </Route>
      <Route path="/worker01">
        <DirectRoute username="worker01" component={WorkerWorkspace} />
      </Route>
      <Route path="/worker02">
        <DirectRoute username="worker02" component={WorkerWorkspace} />
      </Route>
      <Route path="/worker03">
        <DirectRoute username="worker03" component={WorkerWorkspace} />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ── App ─────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
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
          <Router />
          <DevRoleSwitcher />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
