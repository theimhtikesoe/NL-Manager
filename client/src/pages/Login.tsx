import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Factory } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("nl_token", data.token);
      localStorage.setItem("worker_info", JSON.stringify(data.worker));
      if (data.worker.role === "admin") {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/worker/workspace");
      }
    },
    onError: (err) => {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20">
            <Factory className="h-8 w-8 text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            NL-Manager
          </CardTitle>
          <CardDescription className="text-slate-400">
            Industrial machine inspection system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="border-red-500/30 bg-red-500/10 text-red-300"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-400">
                Username
              </Label>
              <Input
                id="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="border-slate-700 bg-slate-950 text-white"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-400">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-700 bg-slate-950 text-white"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
