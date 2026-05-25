import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Cpu,
  LogOut,
  Plus,
  Trash2,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  const { data: workers = [], refetch: refetchWorkers } =
    trpc.factory.getWorkers.useQuery();
  const { data: machines = [], refetch: refetchMachines } =
    trpc.factory.getMachines.useQuery();
  const { data: shiftList = [], refetch: refetchShifts } =
    trpc.factory.getShifts.useQuery();
  const { data: statusGrid = [], refetch: refetchGrid } =
    trpc.factory.getMachineStatusGrid.useQuery(undefined, {
      refetchInterval: 15_000,
    });
  const { data: liveLogs = [], refetch: refetchLogs } =
    trpc.factory.getLiveCheckingLogs.useQuery(undefined, {
      refetchInterval: 10_000,
    });

  const addWorker = trpc.factory.addWorker.useMutation({
    onSuccess: () => {
      toast.success("Worker added");
      refetchWorkers();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteWorker = trpc.factory.deleteWorker.useMutation({
    onSuccess: () => {
      toast.success("Worker removed");
      refetchWorkers();
    },
    onError: (e) => toast.error(e.message),
  });
  const addMachine = trpc.factory.addMachine.useMutation({
    onSuccess: () => {
      toast.success("Machine added");
      refetchMachines();
      refetchGrid();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMachine = trpc.factory.deleteMachine.useMutation({
    onSuccess: () => {
      toast.success("Machine removed");
      refetchMachines();
      refetchGrid();
    },
    onError: (e) => toast.error(e.message),
  });
  const assignShift = trpc.factory.assignShift.useMutation({
    onSuccess: () => {
      toast.success("Shift assigned");
      refetchShifts();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteShift = trpc.factory.deleteShift.useMutation({
    onSuccess: () => refetchShifts(),
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

  const [reviewItem, setReviewItem] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredLogs = liveLogs.filter((log) => {
    if (filterStatus === "ALL") return true;
    return log.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-500 text-slate-950">Pending</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-600">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-amber-400" />
            <div>
              <h1 className="text-lg font-bold">Command Center</h1>
              <p className="text-xs text-slate-500">
                {user?.name} · Admin
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-12">
        {/* Machine status grid */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <Cpu className="h-4 w-4" />
            Machine Status (Today)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {statusGrid.map((m) => (
              <Card
                key={m.id}
                className={`border-slate-800 bg-slate-900/80 transition-all ${
                  m.lastStatus === "REJECTED" ? "border-red-500/50" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{m.machineName}</CardTitle>
                    {m.checkedToday ? (
                      getStatusBadge(m.lastStatus)
                    ) : (
                      <Badge variant="outline" className="text-slate-500">Not Checked</Badge>
                    )}
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {m.machineCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-500 space-y-1">
                  <p>{m.location || "—"} · {m.status}</p>
                  {m.lastCheckedAt && (
                    <p className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="h-3 w-3" />
                      {new Date(m.lastCheckedAt).toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Live feed */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Inspection Review Feed
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-8 bg-slate-900 border-slate-800 text-xs">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="ALL">All Logs</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead>Worker</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-slate-800">
                      <TableCell className="font-medium">{log.workerName ?? "—"}</TableCell>
                      <TableCell>
                        <div>
                          {log.machineName}
                          <div className="text-[10px] text-slate-500 font-mono">{log.machineCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {log.checkedAt
                          ? new Date(log.checkedAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={log.status === "PENDING" ? "default" : "secondary"}
                          className={log.status === "PENDING" ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : ""}
                          onClick={() => {
                            setReviewItem(log);
                            setAdminComment(log.adminComment || "");
                          }}
                        >
                          <Video className="mr-1 h-3 w-3" />
                          {log.status === "PENDING" ? "Review" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-slate-500"
                      >
                        No inspections found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="workers" className="w-full">
          <TabsList className="bg-slate-900">
            <TabsTrigger value="workers">Workers</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
          </TabsList>

          <TabsContent value="workers" className="mt-4">
            <AdminWorkersPanel
              workers={workers}
              onAdd={(v) => addWorker.mutate(v)}
              onDelete={(id) => deleteWorker.mutate({ id })}
              pending={addWorker.isPending}
            />
          </TabsContent>

          <TabsContent value="machines" className="mt-4">
            <AdminMachinesPanel
              machines={machines}
              onAdd={(v) => addMachine.mutate(v)}
              onDelete={(id) => deleteMachine.mutate({ id })}
              pending={addMachine.isPending}
            />
          </TabsContent>

          <TabsContent value="shifts" className="mt-4">
            <AdminShiftsPanel
              shifts={shiftList}
              workers={workers}
              machines={machines}
              onAssign={(v) => assignShift.mutate(v)}
              onDelete={(id) => deleteShift.mutate({ id })}
              pending={assignShift.isPending}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={() => setReviewItem(null)}>
        <DialogContent className="max-w-3xl border-slate-800 bg-slate-900 p-0 overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="bg-black flex items-center justify-center min-h-[300px]">
              {reviewItem?.mediaUrl && (
                reviewItem.mediaUrl.match(/\.(mp4|webm|mov)/i) ? (
                  <video src={reviewItem.mediaUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img
                    src={reviewItem.mediaUrl}
                    alt="Proof"
                    className="w-full h-full object-contain"
                  />
                )
              )}
            </div>
            <div className="p-6 flex flex-col">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center justify-between">
                  <span>Inspection Details</span>
                  {reviewItem && getStatusBadge(reviewItem.status)}
                </DialogTitle>
                <CardDescription>
                  Submitted by {reviewItem?.workerName} for {reviewItem?.machineName}
                </CardDescription>
              </DialogHeader>

              <div className="space-y-4 flex-1">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Worker Notes
                  </p>
                  <p className="text-sm text-slate-300 italic">
                    {reviewItem?.notes || "No notes provided by worker."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Admin Feedback
                  </label>
                  <Textarea
                    placeholder="Add comments or reasons for rejection..."
                    className="bg-slate-950 border-slate-800 min-h-[100px]"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={reviewLog.isPending}
                  onClick={() => reviewLog.mutate({ 
                    id: reviewItem.id, 
                    status: "REJECTED", 
                    adminComment 
                  })}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  disabled={reviewLog.isPending}
                  onClick={() => reviewLog.mutate({ 
                    id: reviewItem.id, 
                    status: "COMPLETED", 
                    adminComment 
                  })}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
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

function AdminWorkersPanel({
  workers,
  onAdd,
  onDelete,
  pending,
}: {
  workers: any[];
  onAdd: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [workerCode, setWorkerCode] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card className="border-slate-800 bg-slate-900/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Workers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="WK001" value={workerCode} onChange={(e) => setWorkerCode(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Button
            disabled={pending}
            onClick={() =>
              onAdd({ workerCode, name, username, password, role: "worker" })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {workers.map((w) => (
              <TableRow key={w.id} className="border-slate-800">
                <TableCell>{w.workerCode}</TableCell>
                <TableCell>{w.name}</TableCell>
                <TableCell>{w.username}</TableCell>
                <TableCell>
                  <Badge variant="outline">{w.role}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(w.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AdminMachinesPanel({
  machines,
  onAdd,
  onDelete,
  pending,
}: {
  machines: any[];
  onAdd: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [machineCode, setMachineCode] = useState("");
  const [machineName, setMachineName] = useState("");
  const [location, setLocation] = useState("");

  return (
    <Card className="border-slate-800 bg-slate-900/80">
      <CardHeader>
        <CardTitle className="text-base">Machines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="MOTOR_01" value={machineCode} onChange={(e) => setMachineCode(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Input placeholder="Water Motor" value={machineName} onChange={(e) => setMachineName(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Button disabled={pending} onClick={() => onAdd({ machineCode, machineName, location })}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((m) => (
              <TableRow key={m.id} className="border-slate-800">
                <TableCell>{m.machineCode}</TableCell>
                <TableCell>{m.machineName}</TableCell>
                <TableCell>{m.location || "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(m.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AdminShiftsPanel({
  shifts,
  workers,
  machines,
  onAssign,
  onDelete,
  pending,
}: {
  shifts: any[];
  workers: any[];
  machines: any[];
  onAssign: (v: any) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [workerId, setWorkerId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftType, setShiftType] = useState<"DAY" | "NIGHT">("DAY");

  return (
    <Card className="border-slate-800 bg-slate-900/80">
      <CardHeader>
        <CardTitle className="text-base">Shift Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger className="border-slate-700 bg-slate-950">
              <SelectValue placeholder="Select Worker" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="border-slate-700 bg-slate-950">
              <SelectValue placeholder="Select Machine" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.machineName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-slate-700 bg-slate-950" />
          <Select value={shiftType} onValueChange={(v: any) => setShiftType(v)}>
            <SelectTrigger className="border-slate-700 bg-slate-950">
              <SelectValue placeholder="Shift" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="DAY">Day</SelectItem>
              <SelectItem value="NIGHT">Night</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={pending || !workerId || !machineId}
            onClick={() => onAssign({ workerId: parseInt(workerId), machineId: parseInt(machineId), assignedDate: date, shiftType })}
          >
            <Plus className="mr-1 h-4 w-4" />
            Assign
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Date</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((s) => (
              <TableRow key={s.id} className="border-slate-800">
                <TableCell>{s.assignedDate}</TableCell>
                <TableCell>{s.workerName}</TableCell>
                <TableCell>{s.machineName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{s.shiftType}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
