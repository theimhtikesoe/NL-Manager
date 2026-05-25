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
} from "lucide-react";
import { toast } from "sonner";

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
      utils.factory.getWorkers.invalidate();
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

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
            Machine Status
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {statusGrid.map((m) => (
              <Card
                key={m.id}
                className="border-slate-800 bg-slate-900/80"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{m.machineName}</CardTitle>
                    <Badge
                      variant={m.checkedToday ? "default" : "destructive"}
                      className={
                        m.checkedToday
                          ? "bg-emerald-600"
                          : "bg-red-600"
                      }
                    >
                      {m.checkedToday ? "Checked" : "Pending"}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {m.machineCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">
                  {m.location || "—"} · {m.status}
                </CardContent>
              </Card>
            ))}
            {statusGrid.length === 0 && (
              <p className="col-span-full text-sm text-slate-500">
                No machines registered yet.
              </p>
            )}
          </div>
        </section>

        {/* Live feed */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Live Inspection Feed
          </h2>
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead>Worker</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveLogs.map((log) => (
                    <TableRow key={log.id} className="border-slate-800">
                      <TableCell>{log.workerName ?? "—"}</TableCell>
                      <TableCell>
                        {log.machineName}{" "}
                        <span className="text-slate-500">
                          ({log.machineCode})
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {log.checkedAt
                          ? new Date(log.checkedAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewUrl(log.mediaUrl)}
                        >
                          <Video className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {liveLogs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-slate-500"
                      >
                        No inspections yet today.
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

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-900">
          <DialogHeader>
            <DialogTitle>Inspection Proof</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="space-y-2">
              {previewUrl.match(/\.(mp4|webm|mov)/i) ? (
                <video src={previewUrl} controls className="w-full rounded-lg" />
              ) : (
                <img
                  src={previewUrl}
                  alt="Proof"
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              )}
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-amber-400 hover:underline"
              >
                Open in new tab
              </a>
            </div>
          )}
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
  workers: { id: number; workerCode: string; name: string; username: string; role: string }[];
  onAdd: (v: {
    workerCode: string;
    name: string;
    username: string;
    password: string;
    role: "admin" | "worker";
  }) => void;
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
  machines: { id: number; machineCode: string; machineName: string; location: string | null }[];
  onAdd: (v: { machineCode: string; machineName: string; location?: string }) => void;
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
                <TableCell className="font-mono">{m.machineCode}</TableCell>
                <TableCell>{m.machineName}</TableCell>
                <TableCell>{m.location ?? "—"}</TableCell>
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
  shifts: {
    id: number;
    workerName: string | null;
    machineName: string | null;
    assignedDate: string;
    shiftType: string;
  }[];
  workers: { id: number; name: string }[];
  machines: { id: number; machineName: string }[];
  onAssign: (v: {
    workerId: number;
    machineId: number;
    assignedDate: string;
    shiftType: "DAY" | "NIGHT";
  }) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const [workerId, setWorkerId] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [assignedDate, setAssignedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [shiftType, setShiftType] = useState<"DAY" | "NIGHT">("DAY");

  return (
    <Card className="border-slate-800 bg-slate-900/80">
      <CardHeader>
        <CardTitle className="text-base">Shift Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger className="w-40 border-slate-700 bg-slate-950">
              <SelectValue placeholder="Worker" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="w-40 border-slate-700 bg-slate-950">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.machineName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)}
            className="w-40 border-slate-700 bg-slate-950"
          />
          <Select
            value={shiftType}
            onValueChange={(v) => setShiftType(v as "DAY" | "NIGHT")}
          >
            <SelectTrigger className="w-28 border-slate-700 bg-slate-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">DAY</SelectItem>
              <SelectItem value="NIGHT">NIGHT</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={pending || !workerId || !machineId}
            onClick={() =>
              onAssign({
                workerId: Number(workerId),
                machineId: Number(machineId),
                assignedDate,
                shiftType,
              })
            }
          >
            Assign
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Worker</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((s) => (
              <TableRow key={s.id} className="border-slate-800">
                <TableCell>{s.workerName}</TableCell>
                <TableCell>{s.machineName}</TableCell>
                <TableCell>{s.assignedDate}</TableCell>
                <TableCell>{s.shiftType}</TableCell>
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
