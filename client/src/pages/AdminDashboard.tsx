import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  LayoutDashboard,
  Users,
  Cpu,
  Calendar,
  Image,
  BarChart3,
  Settings,
  Plus,
  Trash2,
  Video,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Filter,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Inbox,
  Loader2,
  Monitor,
  MapPin,
  Hash,
  Shield,
  User,
  Sun,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────
type TabId =
  | "dashboard"
  | "workers"
  | "machines"
  | "shifts"
  | "reviews"
  | "grid"
  | "analytics"
  | "settings";

interface SidebarItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ─── Sidebar Items ──────────────────────────────────────
const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-5" /> },
  { id: "workers", label: "Workers", icon: <Users className="size-5" /> },
  { id: "machines", label: "Machines", icon: <Cpu className="size-5" /> },
  { id: "shifts", label: "Shifts", icon: <Calendar className="size-5" /> },
  { id: "reviews", label: "Inspection Reviews", icon: <Image className="size-5" /> },
  { id: "grid", label: "Machine Grid", icon: <Monitor className="size-5" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="size-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="size-5" /> },
];

// ─── Animation Variants ─────────────────────────────────
const tabVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// ─── Helper: Status Badge ───────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">Pending</span>;
    case "COMPLETED":
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">Approved</span>;
    case "REJECTED":
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/30">Rejected</span>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function MachineStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />Active</span>;
    case "maintenance":
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30"><span className="size-1.5 rounded-full bg-amber-400" />Maintenance</span>;
    case "offline":
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/30"><span className="size-1.5 rounded-full bg-red-400" />Offline</span>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Helper: Empty State ────────────────────────────────
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl bg-zinc-800/50 p-4 text-zinc-500">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-400">{title}</h3>
      <p className="mt-1 text-xs text-zinc-600">{description}</p>
    </div>
  );
}

// ─── Helper: Stat Card ──────────────────────────────────
function StatCard({ icon, label, value, color, index }: { icon: React.ReactNode; label: string; value: number | string; color: string; index: number }) {
  const colorMap: Record<string, string> = {
    orange: "from-orange-500/10 to-orange-600/5 ring-orange-500/20 text-orange-400",
    blue: "from-blue-500/10 to-blue-600/5 ring-blue-500/20 text-blue-400",
    red: "from-red-500/10 to-red-600/5 ring-red-500/20 text-red-400",
    amber: "from-amber-500/10 to-amber-600/5 ring-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/10 to-emerald-600/5 ring-emerald-500/20 text-emerald-400",
    purple: "from-purple-500/10 to-purple-600/5 ring-purple-500/20 text-purple-400",
  };
  const cls = colorMap[color] || colorMap.orange;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      custom={index}
      className={`rounded-2xl bg-gradient-to-br ${cls} p-5 ring-1 shadow-lg shadow-black/20`}
    >
      <div className="flex items-center justify-between">
        <div>{icon}</div>
        <span className="text-3xl font-bold text-zinc-100">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-400">{label}</p>
    </motion.div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-5 flex-1 rounded bg-zinc-800" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function AdminDashboard({ user }: { user: { id: number; username: string; name: string; role: string } }) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  // ─── Data Queries ───────────────────────────────────
  const { data: workers = [], isLoading: workersLoading, refetch: refetchWorkers } =
    trpc.factory.getWorkers.useQuery();
  const { data: machines = [], isLoading: machinesLoading, refetch: refetchMachines } =
    trpc.factory.getMachines.useQuery();
  const { data: shiftList = [], isLoading: shiftsLoading, refetch: refetchShifts } =
    trpc.factory.getShifts.useQuery();
  const { data: statusGrid = [], isLoading: gridLoading, refetch: refetchGrid } =
    trpc.factory.getMachineStatusGrid.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: liveLogs = [], isLoading: logsLoading, refetch: refetchLogs } =
    trpc.factory.getLiveCheckingLogs.useQuery(undefined, { refetchInterval: 10_000 });

  // ─── Mutations ──────────────────────────────────────
  const addWorker = trpc.factory.addWorker.useMutation({
    onSuccess: () => { toast.success("Worker added successfully"); refetchWorkers(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteWorker = trpc.factory.deleteWorker.useMutation({
    onSuccess: () => { toast.success("Worker removed"); refetchWorkers(); },
    onError: (e) => toast.error(e.message),
  });
  const addMachine = trpc.factory.addMachine.useMutation({
    onSuccess: () => { toast.success("Machine added"); refetchMachines(); refetchGrid(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMachine = trpc.factory.deleteMachine.useMutation({
    onSuccess: () => { toast.success("Machine removed"); refetchMachines(); refetchGrid(); },
    onError: (e) => toast.error(e.message),
  });
  const assignShift = trpc.factory.assignShift.useMutation({
    onSuccess: () => { toast.success("Shift assigned"); refetchShifts(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteShift = trpc.factory.deleteShift.useMutation({
    onSuccess: () => { toast.success("Shift deleted"); refetchShifts(); },
    onError: (e) => toast.error(e.message),
  });
  const reviewLog = trpc.factory.reviewCheckingLog.useMutation({
    onSuccess: () => {
      toast.success("Review submitted");
      refetchLogs();
      refetchGrid();
      setReviewItem(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Local State ────────────────────────────────────
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");

  // ─── Computed Stats ─────────────────────────────────
  const stats = useMemo(() => {
    const totalWorkers = workers.length;
    const totalMachines = machines.length;
    const machinesOffline = machines.filter((m: any) => m.status === "offline").length;
    const pendingLogs = liveLogs.filter((l: any) => l.status === "PENDING").length;
    const completedToday = liveLogs.filter((l: any) => l.status === "COMPLETED").length;
    const machinesByStatus = {
      active: machines.filter((m: any) => m.status === "active").length,
      maintenance: machines.filter((m: any) => m.status === "maintenance").length,
      offline: machinesOffline,
    };
    return { totalWorkers, totalMachines, machinesOffline, pendingLogs, completedToday, machinesByStatus };
  }, [workers, machines, liveLogs]);

  // ─── Tab Content Renderer ──────────────────────────
  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab stats={stats} liveLogs={liveLogs} logsLoading={logsLoading} statusGrid={statusGrid} gridLoading={gridLoading} onReview={(item: any) => { setReviewItem(item); setAdminComment(item.adminComment || ""); }} />;
      case "workers":
        return <WorkersTab workers={workers} loading={workersLoading} onAdd={(v: any) => addWorker.mutate(v)} onDelete={(id: number) => deleteWorker.mutate({ id })} pending={addWorker.isPending} />;
      case "machines":
        return <MachinesTab machines={machines} loading={machinesLoading} onAdd={(v: any) => addMachine.mutate(v)} onDelete={(id: number) => deleteMachine.mutate({ id })} pending={addMachine.isPending} />;
      case "shifts":
        return <ShiftsTab shifts={shiftList} workers={workers} machines={machines} loading={shiftsLoading} onAssign={(v: any) => assignShift.mutate(v)} onDelete={(id: number) => deleteShift.mutate({ id })} pending={assignShift.isPending} />;
      case "reviews":
        return <ReviewsTab liveLogs={liveLogs} loading={logsLoading} onReview={(item: any) => { setReviewItem(item); setAdminComment(item.adminComment || ""); }} />;
      case "grid":
        return <MachineGridTab statusGrid={statusGrid} loading={gridLoading} />;
      case "analytics":
        return <AnalyticsTab stats={stats} liveLogs={liveLogs} />;
      case "settings":
        return <SettingsTab user={user} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ─── Sidebar ──────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800/50 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800/50">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15">
            <Activity className="size-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">NL Manager</h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Command Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-orange-500"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className={isActive ? "text-orange-400" : "text-zinc-500 group-hover:text-zinc-400"}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-zinc-800/50 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15 text-sm font-bold text-orange-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{user.name}</p>
              <p className="truncate text-xs text-zinc-600 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile top bar ───────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden items-center justify-between border-b border-zinc-800/50 bg-zinc-900/95 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-orange-500" />
            <span className="text-sm font-bold">NL Manager</span>
          </div>
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
            <SelectTrigger className="w-[160px] h-8 bg-zinc-800 border-zinc-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {sidebarItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        {/* ─── Main Content ─────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            {/* Page Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {sidebarItems.find((i) => i.id === activeTab)?.label}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {activeTab === "dashboard" && "Overview of your factory operations"}
                {activeTab === "workers" && "Manage factory workers and their credentials"}
                {activeTab === "machines" && "View and manage all registered machines"}
                {activeTab === "shifts" && "Assign workers to machines for specific shifts"}
                {activeTab === "reviews" && "Review worker inspection submissions"}
                {activeTab === "grid" && "Live status of all machines today"}
                {activeTab === "analytics" && "Key metrics and performance insights"}
                {activeTab === "settings" && "System configuration and information"}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ─── Review Dialog ──────────────────────────────── */}
      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-3xl border-zinc-800 bg-zinc-900 p-0 overflow-hidden rounded-2xl">
          <div className="grid md:grid-cols-2">
            {/* Media Preview */}
            <div className="bg-black flex items-center justify-center min-h-[300px]">
              {reviewItem?.mediaUrl && (
                reviewItem.mediaUrl.match(/\.(mp4|webm|mov)/i) ? (
                  <video src={reviewItem.mediaUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={reviewItem.mediaUrl} alt="Proof" className="w-full h-full object-contain" />
                )
              )}
            </div>
            {/* Details */}
            <div className="p-6 flex flex-col">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center justify-between">
                  <span>Inspection Details</span>
                  {reviewItem && <StatusBadge status={reviewItem.status} />}
                </DialogTitle>
                <DialogDescription>
                  Submitted by <span className="text-zinc-300 font-medium">{reviewItem?.workerName}</span> for{" "}
                  <span className="text-zinc-300 font-medium">{reviewItem?.machineName}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 flex-1">
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <MessageSquare className="size-3" /> Worker Notes
                  </p>
                  <p className="text-sm text-zinc-300 italic">
                    {reviewItem?.notes || "No notes provided by worker."}
                  </p>
                </div>

                {reviewItem?.checkedAt && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock className="size-3" />
                    {new Date(reviewItem.checkedAt).toLocaleString()}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Admin Feedback
                  </label>
                  <Textarea
                    placeholder="Add comments or reasons for rejection..."
                    className="bg-zinc-950 border-zinc-800 min-h-[100px] rounded-xl"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2 sm:gap-2">
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={reviewLog.isPending}
                  onClick={() =>
                    reviewLog.mutate({
                      id: reviewItem.id,
                      status: "REJECTED",
                      adminComment,
                    })
                  }
                >
                  <XCircle className="mr-2 size-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={reviewLog.isPending}
                  onClick={() =>
                    reviewLog.mutate({
                      id: reviewItem.id,
                      status: "COMPLETED",
                      adminComment,
                    })
                  }
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Dashboard
// ═══════════════════════════════════════════════════════

function DashboardTab({
  stats,
  liveLogs,
  logsLoading,
  statusGrid,
  gridLoading,
  onReview,
}: {
  stats: any;
  liveLogs: any[];
  logsLoading: boolean;
  statusGrid: any[];
  gridLoading: boolean;
  onReview: (item: any) => void;
}) {
  const recentLogs = liveLogs.slice(0, 5);
  const todayChecked = statusGrid.filter((m) => m.checkedToday).length;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} icon={<ClipboardList className="size-5" />} label="Pending Inspections" value={stats.pendingLogs} color="orange" />
        <StatCard index={1} icon={<Users className="size-5" />} label="Total Workers" value={stats.totalWorkers} color="blue" />
        <StatCard index={2} icon={<AlertTriangle className="size-5" />} label="Machines Offline" value={stats.machinesOffline} color="red" />
        <StatCard index={3} icon={<CheckCircle2 className="size-5" />} label="Completed Today" value={stats.completedToday} color="emerald" />
      </motion.div>

      {/* Quick Overview Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-300">Recent Inspections</h3>
            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">{liveLogs.length} total</Badge>
          </div>
          {logsLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : recentLogs.length === 0 ? (
            <EmptyState icon={<Inbox className="size-8" />} title="No inspections yet" description="Worker inspection logs will appear here" />
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => onReview(log)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500">
                      {log.mediaUrl?.match(/\.(mp4|webm|mov)/i) ? <Video className="size-3.5" /> : <Image className="size-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-300">{log.workerName}</p>
                      <p className="truncate text-xs text-zinc-600">{log.machineName} · {log.machineCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={log.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Machine Status Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-300">Machine Status Overview</h3>
            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">{todayChecked}/{statusGrid.length} checked</Badge>
          </div>
          {gridLoading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : statusGrid.length === 0 ? (
            <EmptyState icon={<Cpu className="size-8" />} title="No machines registered" description="Add machines to see their status here" />
          ) : (
            <div className="divide-y divide-zinc-800/50 max-h-[320px] overflow-y-auto">
              {statusGrid.slice(0, 8).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-300">{m.machineName}</p>
                    <p className="truncate text-xs text-zinc-600 font-mono">{m.machineCode}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.checkedToday ? (
                      <StatusBadge status={m.lastStatus} />
                    ) : (
                      <span className="text-xs text-zinc-600">Not checked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Workers
// ═══════════════════════════════════════════════════════

function WorkersTab({
  workers,
  loading,
  onAdd,
  onDelete,
  pending,
}: {
  workers: any[];
  loading: boolean;
  onAdd: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [workerCode, setWorkerCode] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const validateAndAdd = () => {
    if (workerCode.length < 3) return toast.error("Worker code must be at least 3 characters");
    if (name.length < 2) return toast.error("Name must be at least 2 characters");
    if (username.length < 3) return toast.error("Username must be at least 3 characters");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!/^[A-Z0-9_-]+$/.test(workerCode.toUpperCase())) return toast.error("Worker code must be uppercase alphanumeric");
    if (!/^[a-z0-9._-]+$/.test(username.toLowerCase())) return toast.error("Username must be lowercase alphanumeric");

    onAdd({
      workerCode: workerCode.toUpperCase(),
      name,
      username: username.toLowerCase(),
      password,
      role: "worker" as const,
    });
    setWorkerCode("");
    setName("");
    setUsername("");
    setPassword("");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Add Worker Form */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-800/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4 text-orange-400" />
            Add New Worker
          </span>
          {showForm ? <ChevronUp className="size-4 text-zinc-500" /> : <ChevronDown className="size-4 text-zinc-500" />}
        </button>
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-zinc-800/50 p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Input
                  placeholder="WK001"
                  value={workerCode}
                  onChange={(e) => setWorkerCode(e.target.value.toUpperCase())}
                  className="border-zinc-700 bg-zinc-950 uppercase rounded-xl"
                />
                <Input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-zinc-700 bg-zinc-950 rounded-xl"
                />
                <Input
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="border-zinc-700 bg-zinc-950 rounded-xl"
                />
                <Input
                  placeholder="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-zinc-700 bg-zinc-950 rounded-xl"
                />
                <Button
                  disabled={pending}
                  onClick={validateAndAdd}
                  className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold rounded-xl"
                >
                  {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
                  Add Worker
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workers Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : workers.length === 0 ? (
          <EmptyState icon={<Users className="size-8" />} title="No workers yet" description="Add your first worker using the form above" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500">Code</TableHead>
                <TableHead className="text-zinc-500">Name</TableHead>
                <TableHead className="text-zinc-500">Username</TableHead>
                <TableHead className="text-zinc-500">Role</TableHead>
                <TableHead className="text-zinc-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w: any, i: number) => (
                <motion.tr
                  key={w.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-zinc-400">{w.workerCode}</TableCell>
                  <TableCell className="font-medium text-zinc-200">{w.name}</TableCell>
                  <TableCell className="text-zinc-400">{w.username}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                      w.role === "admin"
                        ? "bg-orange-500/10 text-orange-400 ring-orange-500/30"
                        : "bg-zinc-800 text-zinc-400 ring-zinc-700"
                    }`}>
                      {w.role === "admin" ? <Shield className="size-3" /> : <User className="size-3" />}
                      {w.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onDelete(w.id)}
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Machines
// ═══════════════════════════════════════════════════════

function MachinesTab({
  machines,
  loading,
  onAdd,
  onDelete,
  pending,
}: {
  machines: any[];
  loading: boolean;
  onAdd: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [machineCode, setMachineCode] = useState("");
  const [machineName, setMachineName] = useState("");
  const [location, setLocation] = useState("");

  const handleAdd = () => {
    if (!machineCode.trim()) return toast.error("Machine code is required");
    if (!machineName.trim()) return toast.error("Machine name is required");
    onAdd({ machineCode, machineName, location: location || undefined });
    setMachineCode("");
    setMachineName("");
    setLocation("");
  };

  return (
    <div className="space-y-4">
      {/* Add Machine Form */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-4">
          <Plus className="size-4 text-orange-400" />
          Register New Machine
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="MOTOR_01"
            value={machineCode}
            onChange={(e) => setMachineCode(e.target.value)}
            className="border-zinc-700 bg-zinc-950 rounded-xl"
          />
          <Input
            placeholder="Water Motor"
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            className="border-zinc-700 bg-zinc-950 rounded-xl"
          />
          <Input
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-zinc-700 bg-zinc-950 rounded-xl"
          />
          <Button
            disabled={pending}
            onClick={handleAdd}
            className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold rounded-xl"
          >
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
            Add Machine
          </Button>
        </div>
      </div>

      {/* Machines Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl bg-zinc-800" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20">
          <EmptyState icon={<Cpu className="size-8" />} title="No machines registered" description="Register your first machine using the form above" />
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m: any, i: number) => (
            <motion.div
              key={m.id}
              variants={cardVariants}
              custom={i}
              className={`group relative rounded-2xl bg-zinc-900 border shadow-lg shadow-black/20 p-5 transition-all hover:border-zinc-700 ${
                m.status === "offline" ? "border-red-500/30" : m.status === "maintenance" ? "border-amber-500/30" : "border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-800">
                  <Cpu className={`size-5 ${m.status === "active" ? "text-emerald-400" : m.status === "maintenance" ? "text-amber-400" : "text-red-400"}`} />
                </div>
                <MachineStatusBadge status={m.status} />
              </div>
              <h4 className="text-sm font-semibold text-zinc-200">{m.machineName}</h4>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{m.machineCode}</p>
              {m.location && (
                <p className="flex items-center gap-1 text-xs text-zinc-600 mt-2">
                  <MapPin className="size-3" /> {m.location}
                </p>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onDelete(m.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="size-4" />
              </Button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Shifts
// ═══════════════════════════════════════════════════════

function ShiftsTab({
  shifts,
  workers,
  machines,
  loading,
  onAssign,
  onDelete,
  pending,
}: {
  shifts: any[];
  workers: any[];
  machines: any[];
  loading: boolean;
  onAssign: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [workerId, setWorkerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftType, setShiftType] = useState<"DAY" | "NIGHT">("DAY");

  return (
    <div className="space-y-4">
      {/* Assign Form */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-4">
          <Calendar className="size-4 text-orange-400" />
          Assign Shift
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger className="border-zinc-700 bg-zinc-950 rounded-xl">
              <SelectValue placeholder="Select Worker" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {workers.map((w: any) => (
                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="border-zinc-700 bg-zinc-950 rounded-xl">
              <SelectValue placeholder="Select Machine" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {machines.map((m: any) => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.machineName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-zinc-700 bg-zinc-950 rounded-xl"
          />
          <Select value={shiftType} onValueChange={(v: any) => setShiftType(v)}>
            <SelectTrigger className="border-zinc-700 bg-zinc-950 rounded-xl">
              <SelectValue placeholder="Shift Type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="DAY">
                <span className="flex items-center gap-2"><Sun className="size-3 text-amber-400" /> Day Shift</span>
              </SelectItem>
              <SelectItem value="NIGHT">
                <span className="flex items-center gap-2"><Moon className="size-3 text-blue-400" /> Night Shift</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={pending || !workerId || !machineId}
            onClick={() => onAssign({ workerId: parseInt(workerId), machineId: parseInt(machineId), assignedDate: date, shiftType })}
            className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold rounded-xl"
          >
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
            Assign
          </Button>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : shifts.length === 0 ? (
          <EmptyState icon={<Calendar className="size-8" />} title="No shift assignments" description="Create your first shift assignment above" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500">Date</TableHead>
                <TableHead className="text-zinc-500">Worker</TableHead>
                <TableHead className="text-zinc-500">Machine</TableHead>
                <TableHead className="text-zinc-500">Shift</TableHead>
                <TableHead className="text-zinc-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s: any, i: number) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                >
                  <TableCell className="text-zinc-300">{s.assignedDate}</TableCell>
                  <TableCell className="font-medium text-zinc-200">{s.workerName || "—"}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-zinc-300">{s.machineName || "—"}</span>
                      {s.machineCode && <span className="block text-[10px] font-mono text-zinc-600">{s.machineCode}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      s.shiftType === "DAY"
                        ? "bg-amber-500/10 text-amber-400 ring-amber-500/30"
                        : "bg-blue-500/10 text-blue-400 ring-blue-500/30"
                    }`}>
                      {s.shiftType === "DAY" ? <Sun className="size-3" /> : <Moon className="size-3" />}
                      {s.shiftType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onDelete(s.id)}
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Inspection Reviews
// ═══════════════════════════════════════════════════════

function ReviewsTab({
  liveLogs,
  loading,
  onReview,
}: {
  liveLogs: any[];
  loading: boolean;
  onReview: (item: any) => void;
}) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredLogs = liveLogs.filter((log) => {
    if (filterStatus === "ALL") return true;
    return log.status === filterStatus;
  });

  const counts = {
    all: liveLogs.length,
    pending: liveLogs.filter((l) => l.status === "PENDING").length,
    completed: liveLogs.filter((l) => l.status === "COMPLETED").length,
    rejected: liveLogs.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: "ALL", label: "All", count: counts.all },
          { value: "PENDING", label: "Pending", count: counts.pending },
          { value: "COMPLETED", label: "Approved", count: counts.completed },
          { value: "REJECTED", label: "Rejected", count: counts.rejected },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filterStatus === f.value
                ? "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30"
                : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filterStatus === f.value ? "bg-orange-500/20 text-orange-300" : "bg-zinc-700/50 text-zinc-500"
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Inspection Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-zinc-800" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20">
          <EmptyState icon={<Image className="size-8" />} title="No inspections found" description={filterStatus === "ALL" ? "No inspections submitted yet" : `No ${filterStatus.toLowerCase()} inspections`} />
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLogs.map((log: any, i: number) => (
            <motion.div
              key={log.id}
              variants={cardVariants}
              custom={i}
              onClick={() => onReview(log)}
              className={`group cursor-pointer rounded-2xl bg-zinc-900 border shadow-lg shadow-black/20 overflow-hidden transition-all hover:border-zinc-700 hover:shadow-xl hover:-translate-y-0.5 ${
                log.status === "REJECTED" ? "border-red-500/30" : log.status === "PENDING" ? "border-amber-500/20" : "border-zinc-800"
              }`}
            >
              {/* Thumbnail */}
              <div className="relative h-36 bg-zinc-950 flex items-center justify-center overflow-hidden">
                {log.mediaUrl ? (
                  log.mediaUrl.match(/\.(mp4|webm|mov)/i) ? (
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <Video className="size-10" />
                      <span className="text-xs">Video</span>
                    </div>
                  ) : (
                    <img
                      src={log.mediaUrl}
                      alt="Proof"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )
                ) : (
                  <Image className="size-10 text-zinc-700" />
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={log.status} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="size-6 text-zinc-200" />
                </div>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{log.workerName || "Unknown"}</p>
                </div>
                <p className="text-xs text-zinc-500 truncate">{log.machineName} · {log.machineCode}</p>
                {log.checkedAt && (
                  <p className="flex items-center gap-1 text-[10px] text-zinc-600 mt-2">
                    <Clock className="size-3" />
                    {new Date(log.checkedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Machine Grid
// ═══════════════════════════════════════════════════════

function MachineGridTab({ statusGrid, loading }: { statusGrid: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (statusGrid.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20">
        <EmptyState icon={<Monitor className="size-8" />} title="No machines found" description="Register machines to see their daily status" />
      </div>
    );
  }

  const checked = statusGrid.filter((m) => m.checkedToday).length;
  const unchecked = statusGrid.length - checked;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-500">Today's Progress:</span>
        <div className="flex-1 h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${statusGrid.length ? (checked / statusGrid.length) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
          />
        </div>
        <span className="text-zinc-400 font-mono text-xs">{checked}/{statusGrid.length}</span>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statusGrid.map((m: any, i: number) => (
          <motion.div
            key={m.id}
            variants={cardVariants}
            custom={i}
            className={`rounded-2xl bg-zinc-900 border shadow-lg shadow-black/20 p-5 transition-all ${
              m.lastStatus === "REJECTED"
                ? "border-red-500/40"
                : m.checkedToday
                ? "border-emerald-500/30"
                : "border-zinc-800"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">{m.machineName}</h4>
                <p className="text-xs font-mono text-zinc-600 mt-0.5">{m.machineCode}</p>
              </div>
              {m.checkedToday ? (
                <StatusBadge status={m.lastStatus} />
              ) : (
                <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-600 ring-1 ring-zinc-700">
                  Not Checked
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {m.location || "—"}
              </span>
              <MachineStatusBadge status={m.status} />
            </div>
            {m.lastCheckedAt && (
              <p className="flex items-center gap-1 text-[10px] text-zinc-600 mt-2 border-t border-zinc-800/50 pt-2">
                <Clock className="size-3" />
                Last check: {new Date(m.lastCheckedAt).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Analytics
// ═══════════════════════════════════════════════════════

function AnalyticsTab({ stats, liveLogs }: { stats: any; liveLogs: any[] }) {
  const completionRate = liveLogs.length > 0
    ? Math.round((liveLogs.filter((l: any) => l.status === "COMPLETED").length / liveLogs.length) * 100)
    : 0;

  const rejectionRate = liveLogs.length > 0
    ? Math.round((liveLogs.filter((l: any) => l.status === "REJECTED").length / liveLogs.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Large Stats */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard index={0} icon={<Users className="size-6" />} label="Total Workers" value={stats.totalWorkers} color="blue" />
        <StatCard index={1} icon={<Cpu className="size-6" />} label="Total Machines" value={stats.totalMachines} color="purple" />
        <StatCard index={2} icon={<ClipboardList className="size-6" />} label="Total Inspections" value={liveLogs.length} color="orange" />
      </motion.div>

      {/* Inspection Completion Progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-6">Inspection Results</h3>
        <div className="space-y-5">
          {/* Approval Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Approval Rate</span>
              <span className="text-sm font-bold text-emerald-400">{completionRate}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              />
            </div>
          </div>
          {/* Rejection Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Rejection Rate</span>
              <span className="text-sm font-bold text-red-400">{rejectionRate}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rejectionRate}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
              />
            </div>
          </div>
          {/* Pending Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Pending Review</span>
              <span className="text-sm font-bold text-amber-400">{liveLogs.length > 0 ? 100 - completionRate - rejectionRate : 0}%</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${liveLogs.length > 0 ? 100 - completionRate - rejectionRate : 0}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.7 }}
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Machine Status Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-6">Machine Status Distribution</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active", value: stats.machinesByStatus.active, color: "emerald", icon: <CheckCircle2 className="size-5" /> },
            { label: "Maintenance", value: stats.machinesByStatus.maintenance, color: "amber", icon: <AlertTriangle className="size-5" /> },
            { label: "Offline", value: stats.machinesByStatus.offline, color: "red", icon: <XCircle className="size-5" /> },
          ].map((item, idx) => {
            const total = stats.totalMachines || 1;
            const pct = Math.round((item.value / total) * 100);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center"
              >
                <div className={`mx-auto mb-2 flex size-10 items-center justify-center rounded-xl ${
                  item.color === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
                  item.color === "amber" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                }`}>
                  {item.icon}
                </div>
                <p className="text-2xl font-bold text-zinc-100">{item.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.label}</p>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.8 + idx * 0.1 }}
                    className={`h-full rounded-full ${
                      item.color === "emerald" ? "bg-emerald-500" :
                      item.color === "amber" ? "bg-amber-500" :
                      "bg-red-500"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">{pct}% of total</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: Settings
// ═══════════════════════════════════════════════════════

function SettingsTab({ user }: { user: { id: number; username: string; name: string; role: string } }) {
  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-6 flex items-center gap-2">
          <User className="size-4 text-orange-400" />
          Current User
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl font-bold text-orange-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-200">{user.name}</p>
              <p className="text-sm text-zinc-500">@{user.username}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 pt-4 border-t border-zinc-800/50">
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
              <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">User ID</p>
              <p className="text-sm font-mono text-zinc-300">{user.id}</p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
              <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Role</p>
              <p className="text-sm text-zinc-300 capitalize">{user.role}</p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
              <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Environment</p>
              <p className="text-sm text-zinc-300">{import.meta.env.MODE || "development"}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Settings className="size-4 text-orange-400" />
          System Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Application</p>
            <p className="text-sm text-zinc-300">NL Manager v1.0</p>
          </div>
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Framework</p>
            <p className="text-sm text-zinc-300">React + tRPC + Drizzle</p>
          </div>
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Auto-Refresh</p>
            <p className="text-sm text-zinc-300">Inspections: 10s · Grid: 15s</p>
          </div>
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Build Date</p>
            <p className="text-sm text-zinc-300">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
