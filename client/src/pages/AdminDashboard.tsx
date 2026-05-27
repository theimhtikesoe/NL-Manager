import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Activity, BarChart3, Calendar, CheckCircle2, ClipboardList, Cpu, Image, LayoutDashboard, Plus, Settings, Trash2, Users, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type UserProp = { id: number; username: string; name: string; role: string };

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workers", label: "Workers", icon: Users },
  { id: "machines", label: "Machines", icon: Cpu },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "schedules", label: "Schedules", icon: Calendar },
  { id: "reviews", label: "Upload Reviews", icon: Image },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

const statusColors: Record<string, string> = {
  created: "bg-zinc-600", assigned: "bg-blue-600", in_progress: "bg-amber-500 text-zinc-950",
  waiting_review: "bg-purple-600", completed: "bg-emerald-600", rejected: "bg-red-600",
  pending: "bg-amber-500 text-zinc-950", approved: "bg-emerald-600",
};

export default function AdminDashboard({ user }: { user: UserProp }) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800/50 bg-zinc-900/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/50">
          <Activity className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">NL Manager</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Command Center</p>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-l-2 border-transparent"
                }`}>
                <tab.icon className={`h-4 w-4 ${isActive ? "text-orange-400" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">{user.name.charAt(0)}</div>
            <div className="min-w-0"><p className="text-sm font-medium truncate">{user.name}</p><p className="text-xs text-zinc-500 truncate">{user.role}</p></div>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/95 backdrop-blur overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeTab === tab.id ? "bg-orange-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"}`}>
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {activeTab === "dashboard" && <DashboardTab />}
              {activeTab === "workers" && <WorkersTab />}
              {activeTab === "machines" && <MachinesTab />}
              {activeTab === "tasks" && <TasksTab />}
              {activeTab === "schedules" && <SchedulesTab />}
              {activeTab === "reviews" && <ReviewsTab />}
              {activeTab === "analytics" && <AnalyticsTab />}
              {activeTab === "settings" && <SettingsTab user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = trpc.factory.getStats.useQuery();
  const { data: proofs = [] } = trpc.factory.getTaskProofs.useQuery();
  const { data: scheduleList = [] } = trpc.factory.getSchedules.useQuery();
  const cards = [
    { label: "Active Tasks", value: stats?.activeTasks ?? 0, color: "from-orange-500/20 to-orange-600/5 border-orange-500/20", icon: ClipboardList, iconColor: "text-orange-400" },
    { label: "Total Workers", value: stats?.totalWorkers ?? 0, color: "from-blue-500/20 to-blue-600/5 border-blue-500/20", icon: Users, iconColor: "text-blue-400" },
    { label: "Machines Offline", value: stats?.machinesByStatus?.offline ?? 0, color: "from-red-500/20 to-red-600/5 border-red-500/20", icon: AlertTriangle, iconColor: "text-red-400" },
    { label: "Pending Reviews", value: stats?.pendingReviews ?? 0, color: "from-amber-500/20 to-amber-600/5 border-amber-500/20", icon: Image, iconColor: "text-amber-400" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`bg-gradient-to-br ${c.color} border rounded-2xl shadow-lg shadow-black/20`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3"><c.icon className={`h-5 w-5 ${c.iconColor}`} /></div>
              <p className="text-3xl font-bold">{c.value}</p>
              <p className="text-xs text-zinc-400 mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl shadow-lg shadow-black/20">
          <CardHeader><CardTitle className="text-sm">Recent Proof Uploads</CardTitle></CardHeader>
          <CardContent>
            {proofs.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                <div><p className="text-sm font-medium">{p.taskTitle ?? "Task"}</p><p className="text-xs text-zinc-500">by {p.uploaderName}</p></div>
                <Badge className={statusColors[p.reviewStatus] ?? "bg-zinc-600"}>{p.reviewStatus}</Badge>
              </div>
            ))}
            {proofs.length === 0 && <p className="text-sm text-zinc-500 py-4 text-center">No proof uploads yet</p>}
          </CardContent>
        </Card>
        <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl shadow-lg shadow-black/20">
          <CardHeader><CardTitle className="text-sm">Today's Schedules</CardTitle></CardHeader>
          <CardContent>
            {scheduleList.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                <div><p className="text-sm font-medium">{s.workerName}</p><p className="text-xs text-zinc-500">{s.machineName} · {s.shiftName}</p></div>
                <span className="text-xs text-zinc-400">{s.date}</span>
              </div>
            ))}
            {scheduleList.length === 0 && <p className="text-sm text-zinc-500 py-4 text-center">No schedules</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Workers ─────────────────────────────────────────────
function WorkersTab() {
  const { data: workers = [], refetch } = trpc.factory.getWorkers.useQuery();
  const addWorker = trpc.factory.addWorker.useMutation({ onSuccess: () => { toast.success("Worker added"); refetch(); }, onError: (e) => toast.error(e.message) });
  const deleteWorker = trpc.factory.deleteWorker.useMutation({ onSuccess: () => { toast.success("Worker removed"); refetch(); }, onError: (e) => toast.error(e.message) });
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [dept, setDept] = useState("");
  const handleAdd = () => { if (name.length < 2 || username.length < 3 || password.length < 4) { toast.error("Fill all fields"); return; } addWorker.mutate({ name, username, password, department: dept || undefined }); setName(""); setUsername(""); setPassword(""); setDept(""); };
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Workers</h2>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="bg-zinc-950 border-zinc-800" />
          <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Input placeholder="Department" value={dept} onChange={(e) => setDept(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Button onClick={handleAdd} disabled={addWorker.isPending} className="bg-orange-500 text-zinc-950 hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
        <Table><TableHeader><TableRow className="border-zinc-800"><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{workers.map((w) => (<TableRow key={w.id} className="border-zinc-800"><TableCell className="font-medium">{w.name}</TableCell><TableCell>{w.username}</TableCell><TableCell>{w.department ?? "—"}</TableCell><TableCell><Badge variant="outline">{w.role}</Badge></TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => deleteWorker.mutate({ id: w.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button></TableCell></TableRow>))}
          {workers.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-zinc-500">No workers yet</TableCell></TableRow>}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ─── Machines ────────────────────────────────────────────
function MachinesTab() {
  const { data: machineList = [], refetch } = trpc.factory.getMachines.useQuery();
  const addMachine = trpc.factory.addMachine.useMutation({ onSuccess: () => { toast.success("Machine added"); refetch(); }, onError: (e) => toast.error(e.message) });
  const deleteMachine = trpc.factory.deleteMachine.useMutation({ onSuccess: () => { toast.success("Machine removed"); refetch(); }, onError: (e) => toast.error(e.message) });
  const [code, setCode] = useState(""); const [mname, setMname] = useState(""); const [loc, setLoc] = useState("");
  const machineStatusBadge = (s: string) => s === "active" ? "bg-emerald-600" : s === "maintenance" ? "bg-amber-500 text-zinc-950" : "bg-red-600";
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Machines</h2>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-4 mb-4">
          <Input placeholder="MC-1004" value={code} onChange={(e) => setCode(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Input placeholder="Machine Name" value={mname} onChange={(e) => setMname(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Input placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Button onClick={() => { addMachine.mutate({ machineCode: code, machineName: mname, location: loc || undefined }); setCode(""); setMname(""); setLoc(""); }} disabled={addMachine.isPending} className="bg-orange-500 text-zinc-950 hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machineList.map((m) => (
            <Card key={m.id} className="border-zinc-800/50 bg-zinc-950/50 rounded-xl">
              <CardHeader className="pb-2"><div className="flex justify-between"><CardTitle className="text-base">{m.machineName}</CardTitle><Badge className={machineStatusBadge(m.status)}>{m.status}</Badge></div><CardDescription className="font-mono text-xs">{m.machineCode}</CardDescription></CardHeader>
              <CardContent className="flex justify-between items-center text-xs text-zinc-500"><span>{m.location || "—"}</span><Button size="icon" variant="ghost" onClick={() => deleteMachine.mutate({ id: m.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button></CardContent>
            </Card>
          ))}
        </div>
        {machineList.length === 0 && <p className="text-sm text-zinc-500 py-8 text-center">No machines registered</p>}
      </CardContent></Card>
    </div>
  );
}

// ─── Tasks ───────────────────────────────────────────────
function TasksTab() {
  const { data: taskList = [], refetch } = trpc.factory.getTasks.useQuery();
  const { data: workers = [] } = trpc.factory.getWorkers.useQuery();
  const { data: machineList = [] } = trpc.factory.getMachines.useQuery();
  const createTask = trpc.factory.createTask.useMutation({ onSuccess: () => { toast.success("Task created"); refetch(); }, onError: (e) => toast.error(e.message) });
  const deleteTask = trpc.factory.deleteTask.useMutation({ onSuccess: () => { toast.success("Task deleted"); refetch(); }, onError: (e) => toast.error(e.message) });
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [priority, setPriority] = useState("medium"); const [assignedTo, setAssignedTo] = useState(""); const [machineId, setMachineId] = useState(""); const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Tasks</h2>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Select value={priority} onValueChange={setPriority}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
          <Select value={assignedTo} onValueChange={setAssignedTo}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Assign to worker" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{workers.filter(w => w.role === "worker").map((w) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent></Select>
          <Select value={machineId} onValueChange={setMachineId}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Machine (optional)" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{machineList.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.machineName}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Button onClick={() => { if (!title) { toast.error("Title required"); return; } createTask.mutate({ title, description: desc || undefined, priority: priority as any, assignedTo: assignedTo ? parseInt(assignedTo) : undefined, machineId: machineId ? parseInt(machineId) : undefined, dueDate }); setTitle(""); setDesc(""); }} disabled={createTask.isPending} className="bg-orange-500 text-zinc-950 hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />Create</Button>
        </div>
        <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-zinc-950 border-zinc-800 min-h-[80px]" />
        <Table><TableHeader><TableRow className="border-zinc-800"><TableHead>Title</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Due</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{taskList.map((t) => (
            <TableRow key={t.id} className="border-zinc-800">
              <TableCell className="font-medium max-w-[200px] truncate">{t.title}</TableCell>
              <TableCell><Badge className={t.priority === "high" ? "bg-red-600" : t.priority === "medium" ? "bg-amber-500 text-zinc-950" : "bg-zinc-600"}>{t.priority}</Badge></TableCell>
              <TableCell><Badge className={statusColors[t.status] ?? "bg-zinc-600"}>{t.status.replace("_", " ")}</Badge></TableCell>
              <TableCell className="text-sm">{t.assigneeName ?? "—"}</TableCell>
              <TableCell className="text-xs text-zinc-400">{t.dueDate ?? "—"}</TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => deleteTask.mutate({ id: t.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button></TableCell>
            </TableRow>))}
            {taskList.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-zinc-500">No tasks</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ─── Schedules ───────────────────────────────────────────
function SchedulesTab() {
  const { data: scheduleList = [], refetch } = trpc.factory.getSchedules.useQuery();
  const { data: workers = [] } = trpc.factory.getWorkers.useQuery();
  const { data: machineList = [] } = trpc.factory.getMachines.useQuery();
  const { data: shiftList = [] } = trpc.factory.getShifts.useQuery();
  const createSchedule = trpc.factory.createSchedule.useMutation({ onSuccess: () => { toast.success("Schedule created"); refetch(); }, onError: (e) => toast.error(e.message) });
  const deleteSchedule = trpc.factory.deleteSchedule.useMutation({ onSuccess: () => refetch() });
  const [wId, setWId] = useState(""); const [mId, setMId] = useState(""); const [sId, setSId] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Schedules</h2>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={wId} onValueChange={setWId}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Worker" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{workers.filter(w => w.role === "worker").map((w) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent></Select>
          <Select value={mId} onValueChange={setMId}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Machine" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{machineList.map((m) => <SelectItem key={m.id} value={m.id.toString()}>{m.machineName}</SelectItem>)}</SelectContent></Select>
          <Select value={sId} onValueChange={setSId}><SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue placeholder="Shift" /></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-800">{shiftList.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-950 border-zinc-800" />
          <Button disabled={!wId || !mId || !sId || createSchedule.isPending} onClick={() => createSchedule.mutate({ workerId: parseInt(wId), machineId: parseInt(mId), shiftId: parseInt(sId), date })} className="bg-orange-500 text-zinc-950 hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />Assign</Button>
        </div>
        <Table><TableHeader><TableRow className="border-zinc-800"><TableHead>Date</TableHead><TableHead>Worker</TableHead><TableHead>Machine</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>{scheduleList.map((s) => (
            <TableRow key={s.id} className="border-zinc-800"><TableCell>{s.date}</TableCell><TableCell>{s.workerName}</TableCell><TableCell>{s.machineName}</TableCell><TableCell><Badge variant="outline" style={{ borderColor: s.shiftColor ?? undefined }}>{s.shiftName}</Badge></TableCell><TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => deleteSchedule.mutate({ id: s.id })}><Trash2 className="h-4 w-4 text-red-400" /></Button></TableCell></TableRow>))}
            {scheduleList.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-zinc-500">No schedules</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ─── Upload Reviews ──────────────────────────────────────
function ReviewsTab() {
  const { data: proofs = [], refetch } = trpc.factory.getTaskProofs.useQuery(undefined, { refetchInterval: 10_000 });
  const reviewProof = trpc.factory.reviewTaskProof.useMutation({ onSuccess: () => { toast.success("Review submitted"); refetch(); setReviewItem(null); }, onError: (e) => toast.error(e.message) });
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = proofs.filter((p) => filter === "all" || p.reviewStatus === filter);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Upload Reviews</h2>
        <div className="flex gap-1.5">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${filter === f ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl cursor-pointer hover:border-orange-500/30 transition-all" onClick={() => { setReviewItem(p); setReviewNote(p.reviewNote || ""); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2"><div className="flex items-center gap-2"><Image className="h-4 w-4 text-zinc-500" /><span className="text-sm font-medium">{p.taskTitle ?? "Task"}</span></div><Badge className={statusColors[p.reviewStatus] ?? "bg-zinc-600"}>{p.reviewStatus}</Badge></div>
              <p className="text-xs text-zinc-500">by {p.uploaderName}</p>
              {p.uploadedAt && <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.uploadedAt).toLocaleString()}</p>}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full py-12 text-center text-zinc-500">No proofs match the filter</div>}
      </div>
      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-3xl border-zinc-800 bg-zinc-900 p-0 overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="bg-black flex items-center justify-center min-h-[300px]">
              {reviewItem?.mediaUrl && (reviewItem.mediaType === "video" ? <video src={reviewItem.mediaUrl} controls className="w-full h-full object-contain" /> : <img src={reviewItem.mediaUrl} alt="Proof" className="w-full h-full object-contain" />)}
            </div>
            <div className="p-6 flex flex-col">
              <DialogHeader className="mb-4"><DialogTitle className="flex justify-between"><span>Review Proof</span>{reviewItem && <Badge className={statusColors[reviewItem.reviewStatus] ?? "bg-zinc-600"}>{reviewItem.reviewStatus}</Badge>}</DialogTitle><CardDescription>by {reviewItem?.uploaderName} for {reviewItem?.taskTitle}</CardDescription></DialogHeader>
              <div className="space-y-4 flex-1">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800"><p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Worker Notes</p><p className="text-sm text-zinc-300 italic">{reviewItem?.note || "No notes"}</p></div>
                <div className="space-y-2"><label className="text-xs font-semibold text-zinc-400 uppercase">Admin Feedback</label><Textarea placeholder="Add comments..." className="bg-zinc-950 border-zinc-800 min-h-[80px]" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} /></div>
              </div>
              <DialogFooter className="mt-6 gap-2">
                <Button variant="destructive" className="flex-1" disabled={reviewProof.isPending} onClick={() => reviewProof.mutate({ id: reviewItem.id, reviewStatus: "rejected", reviewNote })}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-500" disabled={reviewProof.isPending} onClick={() => reviewProof.mutate({ id: reviewItem.id, reviewStatus: "approved", reviewNote })}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────────
function AnalyticsTab() {
  const { data: stats } = trpc.factory.getStats.useQuery();
  const total = (stats?.activeTasks ?? 0) + (stats?.completedToday ?? 0);
  const completionRate = total > 0 ? Math.round(((stats?.completedToday ?? 0) / total) * 100) : 0;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Analytics</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5"><p className="text-4xl font-bold text-orange-400">{stats?.completedToday ?? 0}</p><p className="text-xs text-zinc-400 mt-1">Completed Today</p></CardContent></Card>
        <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5"><p className="text-4xl font-bold text-emerald-400">{completionRate}%</p><p className="text-xs text-zinc-400 mt-1">Completion Rate</p></CardContent></Card>
        <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5"><p className="text-4xl font-bold text-blue-400">{stats?.totalMachines ?? 0}</p><p className="text-xs text-zinc-400 mt-1">Total Machines</p></CardContent></Card>
      </div>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5">
        <p className="text-sm font-medium mb-3">Task Completion Progress</p>
        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} /></div>
        <p className="text-xs text-zinc-500 mt-2">{stats?.completedToday ?? 0} of {total} tasks completed today</p>
      </CardContent></Card>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5">
        <p className="text-sm font-medium mb-3">Machine Status Distribution</p>
        <div className="flex gap-4">
          {Object.entries(stats?.machinesByStatus ?? {}).map(([status, c]) => (
            <div key={status} className="flex items-center gap-2"><div className={`h-3 w-3 rounded-full ${status === "active" ? "bg-emerald-500" : status === "maintenance" ? "bg-amber-500" : "bg-red-500"}`} /><span className="text-sm">{status}: {c as number}</span></div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────
function SettingsTab({ user }: { user: UserProp }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>
      <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl"><CardContent className="p-5 space-y-4">
        <div><p className="text-xs text-zinc-500 uppercase font-bold">Current User</p><p className="text-lg font-medium">{user.name}</p></div>
        <div><p className="text-xs text-zinc-500 uppercase font-bold">Role</p><Badge className="bg-orange-500 text-zinc-950">{user.role}</Badge></div>
        <div><p className="text-xs text-zinc-500 uppercase font-bold">Mode</p><Badge variant="outline" className="border-orange-500 text-orange-400">Production Mode</Badge></div>
        <p className="text-xs text-zinc-500 mt-4">System is fully integrated and secured. Database connections and operations are active.</p>
      </CardContent></Card>
    </div>
  );
}
