import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/upload";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FileVideo,
  HardHat,
  Image as ImageIcon,
  Loader2,
  Send,
  UploadCloud,
  X,
  XCircle,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProp {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  machineId: number | null;
  dueDate: string | null;
  createdAt: string;
  machineName?: string | null;
}

interface Schedule {
  id: number;
  machineId: number | null;
  shiftId: number | null;
  date: string;
  status: string;
  machineName?: string | null;
  shiftName?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  shiftColor?: string | null;
}

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  readStatus: boolean;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_LIFECYCLE = [
  "created",
  "assigned",
  "in_progress",
  "waiting_review",
  "completed",
] as const;

const LIFECYCLE_LABELS: Record<string, string> = {
  created: "Created",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_review: "Waiting Review",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  waiting_review: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  created: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STEPPER_DOT_ACTIVE: Record<string, string> = {
  created: "bg-zinc-400",
  assigned: "bg-blue-400",
  in_progress: "bg-amber-400",
  waiting_review: "bg-purple-400",
  completed: "bg-emerald-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  // Handle HH:mm or HH:mm:ss format
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function todayString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Animations ──────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.2 } },
};

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component: WorkerWorkspace
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkerWorkspace({
  user,
}: {
  user: UserProp;
}) {
  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [uploadTaskId, setUploadTaskId] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // ── tRPC queries ─────────────────────────────────────────────────────────
  const tasksQuery = trpc.factory.getMyTasks.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const schedulesQuery = trpc.factory.getMySchedules.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const notificationsQuery = trpc.factory.getNotifications.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // ── Derived data ─────────────────────────────────────────────────────────
  const tasks = tasksQuery.data ?? [];
  const schedules = schedulesQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readStatus).length,
    [notifications]
  );

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => {
      // Show tasks that are due today, assigned today, or currently in-progress
      if (["in_progress", "assigned", "waiting_review"].includes(t.status))
        return true;
      if (t.dueDate && t.dueDate.slice(0, 10) === today) return true;
      if (t.createdAt && t.createdAt.slice(0, 10) === today) return true;
      return false;
    });
  }, [tasks]);

  const historyTasks = useMemo(
    () => tasks.filter((t) => ["completed", "rejected"].includes(t.status)),
    [tasks]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
              <HardHat className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-zinc-100">
                {user.name}
              </h1>
              <p className="text-xs text-zinc-500">{todayString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="border-orange-500/30 bg-orange-500/15 text-orange-400 text-[10px] uppercase tracking-wider">
              {user.role}
            </Badge>
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 transition-colors hover:bg-zinc-800 active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-zinc-400" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-lg px-4 pb-8">
        <AnimatePresence mode="wait">
          {selectedTask ? (
            <TaskDetailView
              key="detail"
              task={selectedTask}
              onBack={handleBackToList}
              onUploadProof={(id) => setUploadTaskId(id)}
              refetchTasks={() => tasksQuery.refetch()}
            />
          ) : (
            <motion.div key="tabs" {...fadeSlide}>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mt-4"
              >
                <TabsList className="w-full bg-zinc-900 border border-zinc-800 h-12 rounded-2xl p-1">
                  <TabsTrigger
                    value="tasks"
                    className="flex-1 rounded-xl h-full text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 text-zinc-400"
                  >
                    <ClipboardList className="mr-1.5 h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger
                    value="schedule"
                    className="flex-1 rounded-xl h-full text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 text-zinc-400"
                  >
                    <Calendar className="mr-1.5 h-4 w-4" />
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 rounded-xl h-full text-sm font-medium data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 text-zinc-400"
                  >
                    <Clock className="mr-1.5 h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                {/* ── Tasks Tab ──────────────────────────────────── */}
                <TabsContent value="tasks" className="mt-4">
                  <TasksList
                    tasks={todayTasks}
                    isLoading={tasksQuery.isLoading}
                    onSelect={handleSelectTask}
                    emptyIcon={<ClipboardList className="h-12 w-12 text-zinc-700" />}
                    emptyText="No tasks assigned for today"
                    emptySubtext="You're all caught up!"
                  />
                </TabsContent>

                {/* ── Schedule Tab ───────────────────────────────── */}
                <TabsContent value="schedule" className="mt-4">
                  <ScheduleList
                    schedules={schedules}
                    isLoading={schedulesQuery.isLoading}
                  />
                </TabsContent>

                {/* ── History Tab ────────────────────────────────── */}
                <TabsContent value="history" className="mt-4">
                  <TasksList
                    tasks={historyTasks}
                    isLoading={tasksQuery.isLoading}
                    onSelect={handleSelectTask}
                    emptyIcon={<Clock className="h-12 w-12 text-zinc-700" />}
                    emptyText="No completed tasks yet"
                    emptySubtext="Completed and rejected tasks will appear here"
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Upload Proof Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {uploadTaskId !== null && (
          <UploadProofOverlay
            taskId={uploadTaskId}
            onClose={() => setUploadTaskId(null)}
            onSuccess={() => {
              setUploadTaskId(null);
              setSelectedTask(null);
              tasksQuery.refetch();
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Notifications Sheet ──────────────────────────────────────── */}
      <NotificationsSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notifications}
        refetch={() => notificationsQuery.refetch()}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: TasksList
// ═══════════════════════════════════════════════════════════════════════════════

function TasksList({
  tasks,
  isLoading,
  onSelect,
  emptyIcon,
  emptyText,
  emptySubtext,
}: {
  tasks: Task[];
  isLoading: boolean;
  onSelect: (task: Task) => void;
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptySubtext: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <Skeleton className="mb-3 h-5 w-3/4 bg-zinc-800" />
            <Skeleton className="mb-2 h-4 w-1/2 bg-zinc-800" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-md bg-zinc-800" />
              <Skeleton className="h-6 w-20 rounded-md bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        {...fadeSlide}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
          {emptyIcon}
        </div>
        <p className="text-base font-medium text-zinc-400">{emptyText}</p>
        <p className="mt-1 text-sm text-zinc-600">{emptySubtext}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, i) => (
        <motion.div
          key={task.id}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layout
        >
          <button
            onClick={() => onSelect(task)}
            className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-zinc-100 leading-snug">
                {task.title}
              </h3>
              <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600" />
            </div>

            {task.machineName && (
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-400">
                <Wrench className="h-3.5 w-3.5" />
                <span>{task.machineName}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
                  PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low
                )}
              >
                {task.priority === "high" && (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                )}
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
                  STATUS_COLORS[task.status] ?? STATUS_COLORS.created
                )}
              >
                {task.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              {task.dueDate && (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: TaskDetailView
// ═══════════════════════════════════════════════════════════════════════════════

function TaskDetailView({
  task,
  onBack,
  onUploadProof,
  refetchTasks,
}: {
  task: Task;
  onBack: () => void;
  onUploadProof: (taskId: number) => void;
  refetchTasks: () => void;
}) {
  const startTaskMutation = trpc.factory.startTask.useMutation({
    onSuccess: () => {
      toast.success("Task started! Get to work 💪");
      refetchTasks();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start task");
    },
  });

  const currentStepIdx = TASK_LIFECYCLE.indexOf(
    task.status as (typeof TASK_LIFECYCLE)[number]
  );
  const isRejected = task.status === "rejected";

  return (
    <motion.div
      key={`detail-${task.id}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      className="pt-4"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex h-10 items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to list
      </button>

      {/* Task card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        {/* Title & priority */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-zinc-100 leading-snug">
            {task.title}
          </h2>
          <span
            className={cn(
              "shrink-0 inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
              PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low
            )}
          >
            {task.priority === "high" && (
              <AlertTriangle className="mr-1 h-3 w-3" />
            )}
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </div>

        {/* Machine */}
        {task.machineName && (
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
            <Wrench className="h-4 w-4 text-zinc-500" />
            <span>{task.machineName}</span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div className="mt-1.5 flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="h-4 w-4" />
            <span>Due {formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div className="mt-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-4">
            <p className="text-sm leading-relaxed text-zinc-300">
              {task.description}
            </p>
          </div>
        )}

        {/* ── Progress Stepper ────────────────────────────────────────── */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Progress
          </p>
          <div className="flex items-center justify-between gap-1">
            {TASK_LIFECYCLE.map((step, idx) => {
              const isActive = idx <= currentStepIdx && !isRejected;
              const isCurrent = step === task.status;
              return (
                <div key={step} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {idx > 0 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 rounded-full transition-colors",
                          isActive ? "bg-orange-500/60" : "bg-zinc-800"
                        )}
                      />
                    )}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.25 : 1,
                      }}
                      className={cn(
                        "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isActive
                          ? `border-transparent ${STEPPER_DOT_ACTIVE[step] ?? "bg-zinc-500"}`
                          : "border-zinc-700 bg-zinc-900"
                      )}
                    >
                      {isActive && idx < currentStepIdx && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                      {isCurrent && !isRejected && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-orange-400"
                          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                      )}
                    </motion.div>
                    {idx < TASK_LIFECYCLE.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 rounded-full transition-colors",
                          idx < currentStepIdx && !isRejected
                            ? "bg-orange-500/60"
                            : "bg-zinc-800"
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] text-center leading-tight",
                      isCurrent && !isRejected
                        ? "font-semibold text-orange-400"
                        : isActive
                          ? "text-zinc-400"
                          : "text-zinc-600"
                    )}
                  >
                    {LIFECYCLE_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Action Area ─────────────────────────────────────────────── */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {task.status === "assigned" && (
              <motion.div key="start" {...fadeSlide}>
                <button
                  onClick={() => startTaskMutation.mutate({ id: task.id })}
                  disabled={startTaskMutation.isPending}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.97] disabled:opacity-60"
                >
                  {startTaskMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <HardHat className="h-5 w-5" />
                      Start Task
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {task.status === "in_progress" && (
              <motion.div key="upload" {...fadeSlide}>
                <button
                  onClick={() => onUploadProof(task.id)}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 active:scale-[0.97]"
                >
                  <Camera className="h-5 w-5" />
                  Upload Proof
                </button>
              </motion.div>
            )}

            {task.status === "waiting_review" && (
              <motion.div
                key="waiting"
                {...fadeSlide}
                className="flex flex-col items-center gap-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 py-6"
              >
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <p className="text-sm font-medium text-purple-300">
                  Waiting for Admin Review…
                </p>
              </motion.div>
            )}

            {task.status === "completed" && (
              <motion.div
                key="completed"
                {...fadeSlide}
                className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 py-6"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">
                  Task Approved ✓
                </p>
              </motion.div>
            )}

            {task.status === "rejected" && (
              <motion.div key="rejected" {...fadeSlide} className="space-y-3">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 py-5">
                  <XCircle className="h-10 w-10 text-red-400" />
                  <p className="text-sm font-semibold text-red-300">
                    Task Rejected — Please Resubmit
                  </p>
                </div>
                <button
                  onClick={() => onUploadProof(task.id)}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-orange-500 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.97]"
                >
                  <UploadCloud className="h-5 w-5" />
                  Re-upload Proof
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: ScheduleList
// ═══════════════════════════════════════════════════════════════════════════════

function ScheduleList({
  schedules,
  isLoading,
}: {
  schedules: Schedule[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <Skeleton className="mb-3 h-5 w-2/3 bg-zinc-800" />
            <Skeleton className="mb-2 h-4 w-1/2 bg-zinc-800" />
            <Skeleton className="h-4 w-1/3 bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <motion.div
        {...fadeSlide}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
          <Calendar className="h-12 w-12 text-zinc-700" />
        </div>
        <p className="text-base font-medium text-zinc-400">
          No schedule for today
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Your upcoming shifts will appear here
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule, i) => (
        <motion.div
          key={schedule.id}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          {/* Machine */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
              <Wrench className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                {schedule.machineName ?? `Machine #${schedule.machineId}`}
              </h3>
              <p className="text-xs text-zinc-500">
                {formatDate(schedule.date)}
              </p>
            </div>
          </div>

          {/* Shift info */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: schedule.shiftColor ?? "#71717a",
                }}
              />
              <span className="text-sm font-medium text-zinc-300">
                {schedule.shiftName ?? "—"}
              </span>
            </div>
            <span className="text-sm text-zinc-400">
              {formatTime(schedule.shiftStart)} – {formatTime(schedule.shiftEnd)}
            </span>
          </div>

          {/* Status */}
          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
                STATUS_COLORS[schedule.status] ?? STATUS_COLORS.created
              )}
            >
              {schedule.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: UploadProofOverlay
// ═══════════════════════════════════════════════════════════════════════════════

function UploadProofOverlay({
  taskId,
  onClose,
  onSuccess,
}: {
  taskId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadProofMutation = trpc.factory.uploadProof.useMutation();
  const submitProofMutation = trpc.factory.submitTaskProof.useMutation();

  const isVideo = file?.type.startsWith("video") ?? false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      // Step 1: Convert to base64
      const dataBase64 = await fileToBase64(file);
      setProgress(30);

      // Step 2: Upload file
      const { mediaUrl } = await uploadProofMutation.mutateAsync({
        dataBase64,
        contentType: file.type,
        fileName: file.name,
      });
      setProgress(70);

      // Step 3: Submit proof
      await submitProofMutation.mutateAsync({
        taskId,
        mediaUrl,
        mediaType: file.type.startsWith("video") ? "video" : "image",
        note: note.trim() || undefined,
      });
      setProgress(100);

      toast.success("Proof submitted successfully! 🎉");
      setTimeout(onSuccess, 300);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-lg font-bold text-zinc-100">Upload Proof</h2>
        <button
          onClick={onClose}
          disabled={isUploading}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
          {/* File input area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!preview ? (
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileTap={{ scale: 0.97 }}
              className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 py-16 transition-colors hover:border-orange-500/50 hover:bg-zinc-900"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15">
                <Camera className="h-8 w-8 text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-zinc-300">
                  Tap to select photo or video
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  JPG, PNG, MP4 supported
                </p>
              </div>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              {/* Preview */}
              <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                {isVideo ? (
                  <video
                    src={preview}
                    controls
                    className="w-full max-h-64 object-contain bg-black"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Proof preview"
                    className="w-full max-h-64 object-contain bg-black"
                  />
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1">
                  {isVideo ? (
                    <FileVideo className="h-3.5 w-3.5 text-orange-400" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-orange-400" />
                  )}
                  <span className="text-xs text-zinc-300 max-w-[180px] truncate">
                    {file?.name}
                  </span>
                </div>
              </div>

              {/* Change file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
              >
                <Camera className="h-4 w-4" />
                Change file
              </button>
            </motion.div>
          )}

          {/* Notes textarea */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">
              Notes (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about the completed task…"
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
            />
          </div>

          {/* Upload progress */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Uploading…
                  </span>
                  <span className="text-sm font-bold text-orange-400">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Submit button */}
      <div className="border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Submit Proof
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: NotificationsSheet
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationsSheet({
  open,
  onOpenChange,
  notifications,
  refetch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  refetch: () => void;
}) {
  const markReadMutation = trpc.factory.markNotificationRead.useMutation({
    onSuccess: () => refetch(),
  });

  const handleMarkRead = (id: number) => {
    markReadMutation.mutate({ id });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 p-0"
      >
        <SheetHeader className="border-b border-zinc-800 p-4">
          <SheetTitle className="text-zinc-100">Notifications</SheetTitle>
          <SheetDescription className="text-zinc-500">
            Stay updated on your tasks and schedules
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 space-y-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                  <Bell className="h-8 w-8 text-zinc-700" />
                </div>
                <p className="text-sm font-medium text-zinc-400">
                  No notifications
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: i * 0.04 },
                  }}
                >
                  <button
                    onClick={() => {
                      if (!notif.readStatus) handleMarkRead(notif.id);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl border p-3.5 transition-colors",
                      notif.readStatus
                        ? "border-zinc-800/50 bg-zinc-900/50"
                        : "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!notif.readStatus && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                          )}
                          <h4
                            className={cn(
                              "text-sm font-semibold truncate",
                              notif.readStatus
                                ? "text-zinc-400"
                                : "text-zinc-100"
                            )}
                          >
                            {notif.title}
                          </h4>
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-sm leading-relaxed",
                            notif.readStatus
                              ? "text-zinc-600"
                              : "text-zinc-400"
                          )}
                        >
                          {notif.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-zinc-600 mt-0.5">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
