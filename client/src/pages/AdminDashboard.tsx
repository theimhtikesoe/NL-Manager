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

        {/* User Info */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/50 p-3 ring-1 ring-zinc-700/50">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-200">{user.name}</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-400">
              {sidebarItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex size-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all">
              <Sun className="size-4" />
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-500">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mx-auto max-w-7xl"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ─── Review Dialog ─────────────────────────────── */}
      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-zinc-100 p-0 overflow-hidden rounded-3xl">
          {reviewItem && (
            <>
              <div className="aspect-video w-full bg-black relative">
                {reviewItem.mediaType === "video" ? (
                  <video src={reviewItem.mediaUrl} controls className="h-full w-full object-contain" />
                ) : (
                  <img src={reviewItem.mediaUrl} className="h-full w-full object-contain" alt="Proof" />
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white font-mono uppercase tracking-wider">
                    {reviewItem.mediaType} Proof
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <DialogTitle className="text-xl font-bold tracking-tight">Review Inspection</DialogTitle>
                    <span className="text-xs font-mono text-zinc-500">{reviewItem.uploadedAt}</span>
                  </div>
                  <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
                    Inspection for <span className="text-zinc-200 font-semibold">{reviewItem.machineName}</span> by <span className="text-zinc-200 font-semibold">{reviewItem.workerName}</span>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Worker Note</p>
                    <p className="text-sm text-zinc-300 italic">"{reviewItem.note || "No notes provided"}"</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Admin Assessment</p>
                    <Textarea
                      placeholder="Add feedback or specific instructions..."
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      className="min-h-[100px] border-zinc-800 bg-zinc-950 text-zinc-200 rounded-2xl focus:ring-orange-500/20"
                    />
                  </div>

                  <DialogFooter className="flex gap-3 sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => reviewLog.mutate({ id: reviewItem.id, status: "REJECTED", adminComment })}
                      className="flex-1 sm:flex-none border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl"
                    >
                      <XCircle className="mr-2 size-4" /> Reject
                    </Button>
                    <Button
                      onClick={() => reviewLog.mutate({ id: reviewItem.id, status: "COMPLETED", adminComment })}
                      className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="mr-2 size-4" /> Approve Inspection
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");

  const validateAndAdd = () => {
    if (name.length < 2) return toast.error("Name must be at least 2 characters");
    if (username.length < 3) return toast.error("Username must be at least 3 characters");
    if (password.length < 4) return toast.error("Password must be at least 4 characters");

    onAdd({
      name,
      username: username.toLowerCase(),
      password,
      department: department || undefined,
      role: "worker" as const,
    });
    setName("");
    setUsername("");
    setPassword("");
    setDepartment("");
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
                <Input
                  placeholder="Department (optional)"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
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
                <TableHead className="text-zinc-500">Name</TableHead>
                <TableHead className="text-zinc-500">Username</TableHead>
                <TableHead className="text-zinc-500">Department</TableHead>
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
                  <TableCell className="font-medium text-zinc-200">{w.name}</TableCell>
                  <TableCell className="text-zinc-400">{w.username}</TableCell>
                  <TableCell className="text-zinc-400">{w.department || "-"}</TableCell>
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
              <SelectItem value="DAY">Day Shift</SelectItem>
              <SelectItem value="NIGHT">Night Shift</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={pending || !workerId || !machineId}
            onClick={() => onAssign({ workerId: Number(workerId), machineId: Number(machineId), date, shiftType })}
            className="bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold rounded-xl"
          >
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}
            Assign
          </Button>
        </div>
      </div>

      {/* Shifts List */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : shifts.length === 0 ? (
          <EmptyState icon={<Calendar className="size-8" />} title="No shifts assigned" description="Assign your first shift using the form above" />
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
                  <TableCell className="font-mono text-xs text-zinc-400">{s.date}</TableCell>
                  <TableCell className="font-medium text-zinc-200">{s.workerName}</TableCell>
                  <TableCell className="text-zinc-400">{s.machineName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.shiftType === "DAY" ? "border-orange-500/30 text-orange-400 bg-orange-500/5" : "border-indigo-500/30 text-indigo-400 bg-indigo-500/5"}>
                      {s.shiftType}
                    </Badge>
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
// TAB: Dashboard
// ═══════════════════════════════════════════════════════

function DashboardTab({ stats, liveLogs, logsLoading, statusGrid, gridLoading, onReview }: any) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} icon={<Users className="size-5" />} label="Total Workers" value={stats.totalWorkers} color="orange" />
        <StatCard index={1} icon={<Cpu className="size-5" />} label="Active Machines" value={stats.totalMachines} color="blue" />
        <StatCard index={2} icon={<AlertTriangle className="size-5" />} label="Machines Offline" value={stats.machinesOffline} color="red" />
        <StatCard index={3} icon={<ClipboardList className="size-5" />} label="Pending Reviews" value={stats.pendingLogs} color="amber" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Machine Status Grid (Quick View) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight text-zinc-200">Machine Status Grid</h3>
            <Badge variant="outline" className="border-zinc-800 text-zinc-500">Real-time</Badge>
          </div>
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 p-6 backdrop-blur-sm">
            {gridLoading ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : statusGrid.length === 0 ? (
              <EmptyState icon={<Monitor className="size-8" />} title="No data" description="Machines will appear here once registered" />
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                {statusGrid.map((m: any) => (
                  <div
                    key={m.id}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all hover:scale-105 ${
                      m.status === "active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                      m.status === "maintenance" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      "bg-red-500/10 border-red-500/20 text-red-500"
                    }`}
                  >
                    <Cpu className="size-5 mb-1" />
                    <span className="text-[10px] font-bold uppercase truncate w-full text-center px-1">{m.machineCode}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight text-zinc-200">Recent Activity</h3>
            <button className="text-xs font-semibold text-orange-400 hover:text-orange-300">View All</button>
          </div>
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden backdrop-blur-sm">
            {logsLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-10 rounded-xl bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4 bg-zinc-800" />
                      <Skeleton className="h-2 w-1/2 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : liveLogs.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={<Inbox className="size-8" />} title="Quiet for now" description="New inspection logs will appear here" />
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {liveLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="group p-4 hover:bg-zinc-800/30 transition-all cursor-pointer" onClick={() => onReview(log)}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 flex size-8 items-center justify-center rounded-lg ${
                        log.status === "PENDING" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {log.status === "PENDING" ? <Clock className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-zinc-200 truncate">{log.machineName}</p>
                          <span className="text-[10px] font-medium text-zinc-600 shrink-0">{log.uploadedAt}</span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">Inspected by {log.workerName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// OTHER TABS (Simplified Placeholders)
// ═══════════════════════════════════════════════════════

function MachineGridTab({ statusGrid, loading }: any) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {loading ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-zinc-900" />) :
        statusGrid.map((m: any) => (
          <div key={m.id} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-center">
            <Cpu className={`size-8 mx-auto mb-2 ${m.status === "active" ? "text-emerald-500" : m.status === "maintenance" ? "text-amber-500" : "text-red-500"}`} />
            <h4 className="text-sm font-bold text-zinc-200">{m.machineName}</h4>
            <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">{m.machineCode}</p>
            <div className="mt-3">
              <MachineStatusBadge status={m.status} />
            </div>
          </div>
        ))}
    </div>
  );
}

function ReviewsTab({ liveLogs, loading, onReview }: any) {
  const pending = liveLogs.filter((l: any) => l.status === "PENDING");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-zinc-200">Pending Reviews</h3>
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">{pending.length} Items</Badge>
      </div>
      {loading ? <TableSkeleton rows={5} /> : pending.length === 0 ? <EmptyState icon={<CheckCircle2 className="size-8" />} title="All caught up!" description="No pending inspections to review" /> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((log: any) => (
            <div key={log.id} className="group rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-all cursor-pointer" onClick={() => onReview(log)}>
              <div className="aspect-video w-full bg-zinc-950">
                <img src={log.mediaUrl} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all" alt="Proof" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-zinc-200">{log.machineName}</h4>
                  <span className="text-[10px] font-mono text-zinc-600">{log.uploadedAt}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-4">Inspected by {log.workerName}</p>
                <Button size="sm" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl">Review Now</Button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function AnalyticsTab({ stats, liveLogs }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Machine Availability</h3>
        <div className="space-y-4">
          {Object.entries(stats.machinesByStatus).map(([status, count]: any) => (
            <div key={status} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase">
                <span className="text-zinc-500">{status}</span>
                <span className="text-zinc-300">{count} Units</span>
              </div>
              <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === "active" ? "bg-emerald-500" : status === "maintenance" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${(count / stats.totalMachines) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center justify-center text-center">
        <BarChart3 className="size-12 text-zinc-800 mb-4" />
        <h3 className="text-sm font-bold text-zinc-400">Detailed analytics coming soon</h3>
        <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">We're still collecting data to build your performance reports.</p>
      </div>
    </div>
  );
}

function SettingsTab({ user }: any) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="size-20 rounded-3xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Shield className="size-10 text-orange-500" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-100">{user.name}</h3>
            <p className="text-sm text-zinc-500">System Administrator • {user.username}</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 ml-1">Display Name</label>
            <Input defaultValue={user.name} className="bg-zinc-950 border-zinc-800 rounded-2xl h-12" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 ml-1">Account Role</label>
            <Input value={user.role} disabled className="bg-zinc-950/50 border-zinc-800/50 rounded-2xl h-12 text-zinc-500" />
          </div>
          <Button className="mt-4 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold h-12 rounded-2xl">Update Profile</Button>
        </div>
      </div>
    </div>
  );
}
