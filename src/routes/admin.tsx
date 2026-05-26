import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getStats, getWorkers, getMachines, getShifts, getSchedules, getTasks, getProofs, getAnalytics,
  addWorker, deleteWorker, addMachine, deleteMachine, updateMachineStatus,
  assignSchedule, deleteSchedule, addTask, deleteTask, reviewProof,
} from "@/lib/nl.functions";
import { TasksPerDayChart, WorkerProductivityChart, MachineUtilizationChart, ProofStatusChart } from "@/components/charts";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  Activity, LayoutDashboard, Users, Cpu, Calendar, Image as ImageIcon,
  BarChart3, Monitor, Shield, Plus, Trash2, Loader2, CheckCircle2, XCircle, Inbox,
  TrendingUp, Search, Download, CalendarDays,
} from "lucide-react";
import { exportCsv } from "@/lib/csv";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "အက်ဒမင် Dashboard — NL Manager" },
      { name: "description", content: "လုပ်ငန်း ထိန်းချုပ်မှု စင်တာ - ဝန်ထမ်းများ၊ စက်များ၊ အလှည့်များ၊ သုံးသပ်ချက်များ။" },
    ],
  }),
  component: AdminDashboard,
});

type TabId = "dashboard" | "workers" | "machines" | "shifts" | "reviews" | "grid" | "tasks" | "analytics";

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workers", label: "ဝန်ထမ်းများ", icon: Users },
  { id: "machines", label: "စက်များ", icon: Cpu },
  { id: "shifts", label: "အလှည့်များ", icon: Calendar },
  { id: "tasks", label: "အလုပ်တာဝန်များ", icon: BarChart3 },
  { id: "reviews", label: "သုံးသပ်ချက်များ", icon: ImageIcon },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "grid", label: "စက် Grid", icon: Monitor },
];

// ── Query options ────────────────────────────────────────
const statsQO = queryOptions({ queryKey: ["stats"], queryFn: () => getStats() });
const workersQO = queryOptions({ queryKey: ["workers"], queryFn: () => getWorkers() });
const machinesQO = queryOptions({ queryKey: ["machines"], queryFn: () => getMachines() });
const shiftsQO = queryOptions({ queryKey: ["shifts"], queryFn: () => getShifts() });
const schedulesQO = queryOptions({ queryKey: ["schedules"], queryFn: () => getSchedules() });
const tasksQO = queryOptions({ queryKey: ["tasks"], queryFn: () => getTasks() });
const proofsQO = queryOptions({ queryKey: ["proofs"], queryFn: () => getProofs() });
const analyticsQO = (days: number) => queryOptions({ queryKey: ["analytics", days], queryFn: () => getAnalytics({ data: { days } }) });

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: any }) {
  const map: Record<string, string> = {
    orange: "from-primary/10 to-primary/5 ring-primary/20 text-primary",
    blue: "from-blue-500/10 to-blue-500/5 ring-blue-500/20 text-blue-400",
    red: "from-red-500/10 to-red-500/5 ring-red-500/20 text-red-400",
    amber: "from-amber-500/10 to-amber-500/5 ring-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 ring-emerald-500/20 text-emerald-400",
    purple: "from-violet-500/10 to-violet-500/5 ring-violet-500/20 text-violet-400",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${map[color] ?? map.orange} p-5 ring-1 shadow-lg shadow-black/20`}>
      <div className="flex items-center justify-between">
        <Icon className="size-5" />
        <span className="text-3xl font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function MachineStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    maintenance: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    offline: "bg-red-500/15 text-red-400 ring-red-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${map[status] ?? map.active}`}>
      <span className={`size-1.5 rounded-full ${status === "active" ? "bg-emerald-400 animate-pulse" : status === "maintenance" ? "bg-amber-400" : "bg-red-400"}`} />
      {status}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    created: "bg-muted text-muted-foreground ring-border",
    assigned: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
    in_progress: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    waiting_review: "bg-violet-500/15 text-violet-400 ring-violet-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 ring-red-500/30",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${map[status] ?? map.created}`}>{status.replace("_", " ")}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl bg-muted p-4 text-muted-foreground"><Inbox className="size-6" /></div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function ExportButton({ onClick, label = "CSV သို့ Export" }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Download className="size-4 mr-1" />{label}
    </Button>
  );
}


// ═══════════════════════════════════════════════════════
function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const qc = useQueryClient();
  const stats = useQuery(statsQO);
  const workers = useQuery(workersQO);
  const machines = useQuery(machinesQO);
  const shifts = useQuery(shiftsQO);
  const schedules = useQuery(schedulesQO);
  const tasks = useQuery(tasksQO);
  const proofs = useQuery(proofsQO);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["workers"] });
    qc.invalidateQueries({ queryKey: ["machines"] });
    qc.invalidateQueries({ queryKey: ["shifts"] });
    qc.invalidateQueries({ queryKey: ["schedules"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["proofs"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card/80 backdrop-blur-sm border-r border-border/50 shrink-0">
        <Link to="/" className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
            <Activity className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">NL Manager</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">ထိန်းချုပ်မှု စင်တာ</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />}
                <Icon className="size-5" />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 ring-1 ring-border/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">အက်ဒမင် အသုံးပြုသူ</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">စီမံခန့်ခွဲသူ</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/50 backdrop-blur-md shrink-0">
          <h2 className="text-sm font-semibold text-muted-foreground">{tabs.find((t) => t.id === activeTab)?.label}</h2>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-[11px] font-mono text-muted-foreground">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </div>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 px-3 py-2 overflow-x-auto border-b border-border/50">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === "dashboard" && <DashboardTab stats={stats.data} tasks={tasks.data ?? []} proofs={proofs.data ?? []} />}
                {activeTab === "workers" && <WorkersTab workers={workers.data ?? []} onChange={invalidateAll} />}
                {activeTab === "machines" && <MachinesTab machines={machines.data ?? []} onChange={invalidateAll} />}
                {activeTab === "shifts" && <ShiftsTab schedules={schedules.data ?? []} workers={workers.data ?? []} machines={machines.data ?? []} shifts={shifts.data ?? []} onChange={invalidateAll} />}
                {activeTab === "tasks" && <TasksTab tasks={tasks.data ?? []} workers={workers.data ?? []} machines={machines.data ?? []} onChange={invalidateAll} />}
                {activeTab === "reviews" && <ReviewsTab proofs={proofs.data ?? []} onChange={invalidateAll} />}
                {activeTab === "analytics" && <AnalyticsTab />}
                {activeTab === "grid" && <MachineGridTab machines={machines.data ?? []} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Tab: Dashboard ──────────────────────────────────────
function DashboardTab({ stats, tasks, proofs }: any) {
  const recentTasks = tasks.slice(0, 6);
  const pendingProofs = proofs.filter((p: any) => p.review_status === "pending").slice(0, 4);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="ဝန်ထမ်းများ" value={stats?.totalWorkers ?? 0} color="blue" icon={Users} />
        <StatCard label="စက်များ" value={stats?.totalMachines ?? 0} color="orange" icon={Cpu} />
        <StatCard label="လုပ်နေသော တာဝန်များ" value={stats?.activeTasks ?? 0} color="amber" icon={BarChart3} />
        <StatCard label="စောင့်ဆိုင်း သုံးသပ်ချက်" value={stats?.pendingReviews ?? 0} color="purple" icon={ImageIcon} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="အလုပ်လုပ်နေသော စက်များ" value={stats?.machinesByStatus?.active ?? 0} color="emerald" icon={Cpu} />
        <StatCard label="ပြုပြင်နေသော စက်များ" value={stats?.machinesByStatus?.maintenance ?? 0} color="amber" icon={Cpu} />
        <StatCard label="ပိတ်ထားသော စက်များ" value={stats?.machinesByStatus?.offline ?? 0} color="red" icon={Cpu} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-card border border-border p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">မကြာသေးမီ တာဝန်များ</h3>
          {recentTasks.length === 0 ? <EmptyState title="တာဝန် မရှိ" description="Tasks tab မှ ဖန်တီးပါ" /> : (
            <ul className="space-y-2">
              {recentTasks.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.machine?.machine_code ?? "—"} · {t.assignee?.name ?? "မသတ်မှတ်ရသေး"}
                    </p>
                  </div>
                  <TaskStatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">စောင့်ဆိုင်း သုံးသပ်ချက်များ</h3>
          {pendingProofs.length === 0 ? <EmptyState title="ပြီးပြည့်စုံပါပြီ" description="သုံးသပ်ရန် အထောက်အထား မရှိပါ" /> : (
            <ul className="space-y-2">
              {pendingProofs.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.task?.title ?? "တာဝန်"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.uploader?.name} မှ</p>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-amber-400">စောင့်ဆိုင်း</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Workers ────────────────────────────────────────
function WorkersTab({ workers, onChange }: any) {
  const add = useServerFn(addWorker);
  const del = useServerFn(deleteWorker);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "worker" as "admin" | "worker", department: "" });

  const m = useMutation({
    mutationFn: () => add({ data: { ...form, department: form.department || null } }),
    onSuccess: () => { toast.success("ဝန်ထမ်း ထည့်ပြီးပါပြီ"); onChange(); setOpen(false); setForm({ username: "", name: "", role: "worker", department: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const d = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("ဝန်ထမ်း ဖယ်ရှားပြီးပါပြီ"); onChange(); }, onError: (e: any) => toast.error(e.message) });

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "worker">("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return workers.filter((w: any) => {
      if (roleFilter !== "all" && w.role !== roleFilter) return false;
      if (!term) return true;
      return [w.name, w.username, w.department].some((v: any) => (v ?? "").toString().toLowerCase().includes(term));
    });
  }, [workers, q, roleFilter]);

  const handleExport = () => exportCsv("workers", filtered, [
    { key: "name", label: "အမည်" },
    { key: "username", label: "အသုံးပြုသူအမည်" },
    { key: "role", label: "ရာထူး" },
    { key: "department", label: "ဌာန" },
    { key: "created_at", label: "ဖန်တီးချိန်" },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1">
          <SearchBar value={q} onChange={setQ} placeholder="ဝန်ထမ်း ရှာရန်…" />
          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">အားလုံး</SelectItem>
              <SelectItem value="admin">အက်ဒမင်</SelectItem>
              <SelectItem value="worker">ဝန်ထမ်း</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{filtered.length}/{workers.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExport} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />ဝန်ထမ်း ထည့်ရန်</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>ဝန်ထမ်း ထည့်ရန်</DialogTitle><DialogDescription>စက်ရုံ ဝန်ထမ်း ပရိုဖိုင် အသစ်ဖန်တီးပါ။</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="အသုံးပြုသူအမည်" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                <Input placeholder="အမည်အပြည့်အစုံ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="ဌာန" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="worker">ဝန်ထမ်း</SelectItem><SelectItem value="admin">အက်ဒမင်</SelectItem></SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={() => m.mutate()} disabled={m.isPending || !form.username || !form.name}>
                  {m.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}သိမ်းမည်
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-3">အမည်</th><th className="text-left px-4 py-3">အသုံးပြုသူအမည်</th><th className="text-left px-4 py-3">ရာထူး</th><th className="text-left px-4 py-3">ဌာန</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5}><EmptyState title="ရှာဖွေမှု မတွေ့" description={workers.length === 0 ? "ပထမဆုံး ဝန်ထမ်း ထည့်ပါ" : "အခြား စကားလုံးဖြင့် ရှာကြည့်ပါ"} /></td></tr>}
            {filtered.map((w: any) => (
              <tr key={w.id} className="border-t border-border/50">
                <td className="px-4 py-3 font-semibold">{w.name}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{w.username}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${w.role === "admin" ? "bg-primary/15 text-primary ring-primary/30" : "bg-cyan-500/15 text-cyan-400 ring-cyan-500/30"}`}>{w.role}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{w.department ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => d.mutate(w.id)}><Trash2 className="size-4 text-red-400" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Machines ───────────────────────────────────────
function MachinesTab({ machines, onChange }: any) {
  const add = useServerFn(addMachine);
  const del = useServerFn(deleteMachine);
  const upd = useServerFn(updateMachineStatus);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ machine_code: "", machine_name: "", status: "active" as const, location: "" });
  const m = useMutation({
    mutationFn: () => add({ data: { ...form, location: form.location || null } }),
    onSuccess: () => { toast.success("စက် ထည့်ပြီးပါပြီ"); onChange(); setOpen(false); setForm({ machine_code: "", machine_name: "", status: "active", location: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const d = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("ဖယ်ရှားပြီး"); onChange(); } });
  const s = useMutation({ mutationFn: (v: { id: string; status: any }) => upd({ data: v }), onSuccess: () => { toast.success("အခြေအနေ update လုပ်ပြီး"); onChange(); } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">စက် {machines.length} လုံး</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />စက် ထည့်ရန်</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>စက် ထည့်ရန်</DialogTitle><DialogDescription>အလုပ်ခွင်တွင် စက်အသစ် မှတ်ပုံတင်ပါ။</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="ကုဒ် (ဥပမာ NL-007)" value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} />
              <Input placeholder="အမည်" value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} />
              <Input placeholder="တည်နေရာ" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={() => m.mutate()} disabled={m.isPending || !form.machine_code || !form.machine_name}>
                {m.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}သိမ်းမည်
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {machines.length === 0 && <div className="col-span-full"><EmptyState title="စက် မရှိ" description="ပထမဆုံး စက် မှတ်ပုံတင်ပါ" /></div>}
        {machines.map((m: any) => (
          <div key={m.id} className="rounded-2xl bg-card border border-border p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{m.machine_code}</p>
                <h4 className="font-bold mt-0.5">{m.machine_name}</h4>
              </div>
              <Button size="sm" variant="ghost" onClick={() => d.mutate(m.id)}><Trash2 className="size-4 text-red-400" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{m.location ?? "တည်နေရာ မသတ်မှတ်ရသေး"}</p>
            <div className="flex items-center justify-between">
              <MachineStatusBadge status={m.status} />
              <Select value={m.status} onValueChange={(v) => s.mutate({ id: m.id, status: v })}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">အလုပ်လုပ်နေ</SelectItem>
                  <SelectItem value="maintenance">ပြုပြင်နေ</SelectItem>
                  <SelectItem value="offline">ပိတ်ထား</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Shifts (Schedules) ─────────────────────────────
function ShiftsTab({ schedules, workers, machines, shifts, onChange }: any) {
  const assign = useServerFn(assignSchedule);
  const del = useServerFn(deleteSchedule);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ worker_id: "", machine_id: "", shift_id: "", date: today });
  const m = useMutation({
    mutationFn: () => assign({ data: form }),
    onSuccess: () => { toast.success("အလှည့် သတ်မှတ်ပြီးပါပြီ"); onChange(); setForm({ worker_id: "", machine_id: "", shift_id: "", date: today }); },
    onError: (e: any) => toast.error(e.message),
  });
  const d = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("ဖယ်ရှားပြီး"); onChange(); } });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">အလှည့် သတ်မှတ်ရန်</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
            <SelectTrigger><SelectValue placeholder="ဝန်ထမ်း" /></SelectTrigger>
            <SelectContent>{workers.filter((w: any) => w.role === "worker").map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
            <SelectTrigger><SelectValue placeholder="စက်" /></SelectTrigger>
            <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.shift_id} onValueChange={(v) => setForm({ ...form, shift_id: v })}>
            <SelectTrigger><SelectValue placeholder="အလှည့်" /></SelectTrigger>
            <SelectContent>{shifts.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.worker_id || !form.machine_id || !form.shift_id}>
            {m.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}သတ်မှတ်မည်
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-3">ရက်စွဲ</th><th className="text-left px-4 py-3">ဝန်ထမ်း</th><th className="text-left px-4 py-3">စက်</th><th className="text-left px-4 py-3">အလှည့်</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {schedules.length === 0 && <tr><td colSpan={5}><EmptyState title="အလှည့် မသတ်မှတ်ရသေး" description="အပေါ်တွင် သတ်မှတ်ပါ" /></td></tr>}
            {schedules.map((s: any) => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="px-4 py-3 font-mono text-xs">{s.date}</td>
                <td className="px-4 py-3 font-semibold">{s.worker?.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.machine?.machine_code} — {s.machine?.machine_name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${s.shift?.color}25`, color: s.shift?.color }}>
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: s.shift?.color }} />
                    {s.shift?.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => d.mutate(s.id)}><Trash2 className="size-4 text-red-400" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Tasks ──────────────────────────────────────────
function TasksTab({ tasks, workers, machines, onChange }: any) {
  const add = useServerFn(addTask);
  const del = useServerFn(deleteTask);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as const, assigned_to: "", machine_id: "", due_date: "" });
  const m = useMutation({
    mutationFn: () => add({ data: {
      title: form.title, description: form.description || null, priority: form.priority,
      assigned_to: form.assigned_to || null, machine_id: form.machine_id || null,
      due_date: form.due_date || null,
    }}),
    onSuccess: () => { toast.success("တာဝန် ဖန်တီးပြီးပါပြီ"); onChange(); setOpen(false); setForm({ title: "", description: "", priority: "medium", assigned_to: "", machine_id: "", due_date: "" }); },
    onError: (e: any) => toast.error(e.message),
  });
  const d = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { toast.success("ဖျက်ပြီး"); onChange(); } });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tasks.filter((t: any) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!term) return true;
      return [t.title, t.description, t.assignee?.name, t.machine?.machine_code, t.machine?.machine_name]
        .some((v: any) => (v ?? "").toString().toLowerCase().includes(term));
    });
  }, [tasks, q, statusFilter, priorityFilter]);

  const handleExport = () => exportCsv("tasks", filtered, [
    { key: "title", label: "ခေါင်းစဉ်" },
    { key: "priority", label: "ဦးစားပေး" },
    { key: "status", label: "အခြေအနေ" },
    { key: "assignee", label: "တာဝန်ပေးထား", get: (t: any) => t.assignee?.name ?? "" },
    { key: "machine", label: "စက်", get: (t: any) => t.machine?.machine_code ?? "" },
    { key: "due_date", label: "ပြီးရမည့်ရက်" },
    { key: "created_at", label: "ဖန်တီးချိန်" },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <SearchBar value={q} onChange={setQ} placeholder="တာဝန် ရှာရန်…" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">အခြေအနေ အားလုံး</SelectItem>
              <SelectItem value="created">ဖန်တီးပြီး</SelectItem>
              <SelectItem value="assigned">တာဝန်ပေးပြီး</SelectItem>
              <SelectItem value="in_progress">လုပ်ဆောင်နေ</SelectItem>
              <SelectItem value="waiting_review">သုံးသပ်ဆဲ</SelectItem>
              <SelectItem value="completed">ပြီးစီး</SelectItem>
              <SelectItem value="rejected">ပယ်ချ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ဦးစားပေး အားလုံး</SelectItem>
              <SelectItem value="high">မြင့်</SelectItem>
              <SelectItem value="medium">အလယ်</SelectItem>
              <SelectItem value="low">နိမ့်</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{filtered.length}/{tasks.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExport} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />တာဝန်အသစ်</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>တာဝန် ဖန်တီးရန်</DialogTitle><DialogDescription>ဝန်ထမ်းတစ်ဦးအား တာဝန်အသစ် ပေးပါ။</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="ခေါင်းစဉ်" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="ဖော်ပြချက်" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">နိမ့်</SelectItem>
                      <SelectItem value="medium">အလယ်</SelectItem>
                      <SelectItem value="high">မြင့်</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="ဝန်ထမ်းသို့ တာဝန်ပေး" /></SelectTrigger>
                  <SelectContent>{workers.filter((w: any) => w.role === "worker").map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                  <SelectTrigger><SelectValue placeholder="စက်" /></SelectTrigger>
                  <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={() => m.mutate()} disabled={m.isPending || !form.title}>
                  {m.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}ဖန်တီးမည်
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-4 py-3">တာဝန်</th><th className="text-left px-4 py-3">စက်</th><th className="text-left px-4 py-3">တာဝန်ပေးထား</th><th className="text-left px-4 py-3">ဦးစားပေး</th><th className="text-left px-4 py-3">အခြေအနေ</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={6}><EmptyState title="တာဝန် မရှိ" description="ပထမဆုံး တာဝန် ဖန်တီးပါ" /></td></tr>}
            {tasks.map((t: any) => (
              <tr key={t.id} className="border-t border-border/50">
                <td className="px-4 py-3 font-semibold">{t.title}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.machine?.machine_code ?? "—"}</td>
                <td className="px-4 py-3">{t.assignee?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${t.priority === "high" ? "bg-red-500/15 text-red-400 ring-red-500/30" : t.priority === "medium" ? "bg-amber-500/15 text-amber-400 ring-amber-500/30" : "bg-muted text-muted-foreground ring-border"}`}>{t.priority}</span>
                </td>
                <td className="px-4 py-3"><TaskStatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => d.mutate(t.id)}><Trash2 className="size-4 text-red-400" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Reviews ────────────────────────────────────────
function ReviewsTab({ proofs, onChange }: any) {
  const review = useServerFn(reviewProof);
  const [selected, setSelected] = useState<any>(null);
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: (v: { id: string; review_status: "approved" | "rejected" }) => review({ data: { ...v, review_note: note } }),
    onSuccess: () => { toast.success("သုံးသပ်ချက် တင်ပြီးပါပြီ"); onChange(); setSelected(null); setNote(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {proofs.length === 0 ? <EmptyState title="အထောက်အထား မရှိသေး" description="ဝန်ထမ်းများ စစ်ဆေးမှု အထောက်အထား မတင်ရသေး" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {proofs.map((p: any, i: number) => (
              <motion.button
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.2 }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                onClick={() => { setSelected(p); setNote(p.review_note ?? ""); }}
                className="text-left rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-black/30 transition-colors"
              >
                <div className="aspect-video bg-black relative overflow-hidden">
                  {p.media_type === "video" ? (
                    <video src={p.media_url} className="w-full h-full object-cover" preload="metadata" />
                  ) : (
                    <img src={p.media_url} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" alt="" loading="lazy" />
                  )}
                  {p.media_type === "video" && (
                    <span className="absolute bottom-2 left-2 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase bg-black/70 text-white">ဗီဒီယို</span>
                  )}
                  <span className={`absolute top-2 right-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ring-1 ${p.review_status === "pending" ? "bg-amber-500/80 text-black ring-amber-300" : p.review_status === "approved" ? "bg-emerald-500/80 text-black ring-emerald-300" : "bg-red-500/80 text-white ring-red-300"}`}>{p.review_status === "pending" ? "စောင့်ဆိုင်း" : p.review_status === "approved" ? "ခွင့်ပြု" : "ပယ်ချ"}</span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold truncate">{p.task?.title ?? "တာဝန်"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{p.uploader?.name} · {p.task?.machine?.machine_code}</p>
                  {p.note && <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">"{p.note}"</p>}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl">
          {selected && (
            <>
              <div className="aspect-video w-full bg-black -mx-6 -mt-6 mb-4 overflow-hidden">
                {selected.media_type === "video"
                  ? <video src={selected.media_url} controls autoPlay className="w-full h-full object-contain" />
                  : <img src={selected.media_url} className="w-full h-full object-contain" alt="" />}
              </div>
              <DialogHeader>
                <DialogTitle>စစ်ဆေးမှု သုံးသပ်ရန်</DialogTitle>
                <DialogDescription>
                  {selected.task?.title} · {selected.uploader?.name} မှ upload တင်
                  {selected.task?.machine?.machine_code && ` · ${selected.task.machine.machine_code}`}
                </DialogDescription>
              </DialogHeader>
              {selected.note && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">ဝန်ထမ်း မှတ်ချက်</p>
                  <p className="text-sm italic">"{selected.note}"</p>
                </div>
              )}
              <Textarea placeholder="အက်ဒမင် သုံးသပ်ချက်..." value={note} onChange={(e) => setNote(e.target.value)} />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => m.mutate({ id: selected.id, review_status: "rejected" })} disabled={m.isPending}>
                  <XCircle className="size-4 mr-1" />ပယ်ချမည်
                </Button>
                <Button onClick={() => m.mutate({ id: selected.id, review_status: "approved" })} disabled={m.isPending}>
                  <CheckCircle2 className="size-4 mr-1" />ခွင့်ပြုမည်
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Machine Grid ───────────────────────────────────
function MachineGridTab({ machines }: any) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {machines.map((m: any) => (
        <div key={m.id} className={`relative rounded-2xl border p-4 ${m.status === "active" ? "bg-emerald-500/5 border-emerald-500/30" : m.status === "maintenance" ? "bg-amber-500/5 border-amber-500/30" : "bg-red-500/5 border-red-500/30"}`}>
          <div className={`absolute top-3 right-3 size-2 rounded-full ${m.status === "active" ? "bg-emerald-400 animate-pulse" : m.status === "maintenance" ? "bg-amber-400" : "bg-red-400"}`} />
          <p className="font-mono text-xs text-muted-foreground">{m.machine_code}</p>
          <p className="font-bold mt-1 text-sm truncate">{m.machine_name}</p>
          <p className="mt-3 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{m.status}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Analytics ──────────────────────────────────────
function AnalyticsTab() {
  const [days, setDays] = useState(14);
  const analytics = useQuery(analyticsQO(days));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Analytics ခြုံငုံသုံးသပ်ချက်</p>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              လွန်ခဲ့သော {d} ရက်
            </button>
          ))}
        </div>
      </div>

      {analytics.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-5 h-80 animate-pulse" />
          ))}
        </div>
      ) : analytics.error ? (
        <EmptyState title="Analytics load မရပါ" description="နောက်မှ ပြန်ကြိုးစားပါ" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <TasksPerDayChart data={analytics.data?.tasksPerDay ?? []} />
          <WorkerProductivityChart data={analytics.data?.workerProductivity ?? []} />
          <MachineUtilizationChart data={analytics.data?.machineUtilization ?? []} />
          <ProofStatusChart data={analytics.data?.proofStatus ?? { pending: 0, approved: 0, rejected: 0 }} />
        </div>
      )}
    </div>
  );
}
