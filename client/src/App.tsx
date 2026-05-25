import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerWorkspace from "./pages/WorkerWorkspace";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

function ProtectedRoute({
  component: Component,
  adminOnly = false,
  workerOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
  workerOnly?: boolean;
}) {
  const { user, loading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
  });

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (adminOnly && user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Admin access only.
      </div>
    );
  }

  if (workerOnly && user?.role !== "worker") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Worker access only.
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/worker/workspace">
        <ProtectedRoute component={WorkerWorkspace} workerOnly />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
