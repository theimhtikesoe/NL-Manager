import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Shield, Wrench, Users, ChevronUp, ChevronDown } from "lucide-react";

const roles = [
  { to: "/admin", label: "Admin", icon: Shield, color: "text-primary" },
  { to: "/worker/worker01", label: "Worker 01 — Aung Min", icon: Wrench, color: "text-cyan-400" },
  { to: "/worker/worker02", label: "Worker 02 — Hla Hla", icon: Wrench, color: "text-emerald-400" },
  { to: "/worker/worker03", label: "Worker 03 — Kyaw Soe", icon: Users, color: "text-violet-400" },
];

export function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const current = roles.find((r) => location.pathname.startsWith(r.to)) ?? roles[0];

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {open && (
        <div className="mb-2 flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = location.pathname.startsWith(r.to);
            return (
              <Link
                key={r.to}
                to={r.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/95 text-foreground hover:bg-accent border border-border backdrop-blur-sm"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : r.color}`} />
                {r.label}
              </Link>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-card/95 backdrop-blur-sm border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-xl hover:bg-accent transition-all"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-muted-foreground">Demo</span>
        <span>{current.label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}
