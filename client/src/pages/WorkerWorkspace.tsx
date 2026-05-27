import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Camera, Calendar, CheckCircle2, ChevronLeft, ClipboardList, Clock, History, Loader2, Upload, XCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type UserProp = { id: number; username: string; name: string; role: string };

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-600", in_progress: "bg-amber-500 text-zinc-950", waiting_review: "bg-purple-600",
  completed: "bg-emerald-600", rejected: "bg-red-600", created: "bg-zinc-600",
};
const PRIORITY_COLORS: Record<string, string> = { low: "bg-zinc-600", medium: "bg-amber-500 text-zinc-950", high: "bg-red-600" };
const LIFECYCLE = ["created", "assigned", "in_progress", "waiting_review", "completed"];

export default function WorkerWorkspace({ user }: { user: UserProp }) {
  const [tab, setTab] = useState<"tasks" | "schedule" | "history">("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const tabs = [
    { id: "tasks" as const, label: "Tasks", icon: ClipboardList },
    { id: "schedule" as const, label: "Schedule", icon: Calendar },
    { id: "history" as const, label: "History", icon: History },
  ];

  const { data: taskList = [], refetch: refetchTasks } = trpc.factory.getMyTasks.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: scheduleList = [] } = trpc.factory.getMySchedules.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: notifs = [], refetch: refetchNotifs } = trpc.factory.getNotifications.useQuery(undefined, { refetchInterval: 30_000 });
  const markRead = trpc.factory.markNotificationRead.useMutation({ onSuccess: () => refetchNotifs() });

  const unreadCount = notifs.filter((n) => !n.readStatus).length;
  const selectedTask = taskList.find((t) => t.id === selectedTaskId) ?? null;
  const activeTasks = taskList.filter((t) => !["completed", "rejected"].includes(t.status));
  const historyTasks = taskList.filter((t) => ["completed", "rejected"].includes(t.status));

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{user.name}</h1>
            <div className="flex items-center gap-2"><Badge className="bg-orange-500/20 text-orange-400 text-[10px]">{user.role}</Badge><span className="text-[10px] text-zinc-500">{today}</span></div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="relative p-2"><Bell className="h-5 w-5 text-zinc-400" />{unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-bold flex items-center justify-center text-zinc-950">{unreadCount}</span>}</button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-900 border-zinc-800 w-[320px]">
              <SheetHeader><SheetTitle className="text-zinc-100">Notifications</SheetTitle></SheetHeader>
              <div className="space-y-2 mt-4 overflow-y-auto max-h-[80vh]">
                {notifs.map((n) => (
                  <div key={n.id} onClick={() => !n.readStatus && markRead.mutate({ id: n.id })} className={`p-3 rounded-xl border transition-all cursor-pointer ${n.readStatus ? "bg-zinc-950/50 border-zinc-800/30" : "bg-zinc-800/50 border-orange-500/20"}`}>
                    <div className="flex items-start gap-2">{!n.readStatus && <div className="h-2 w-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />}<div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-zinc-400 mt-0.5">{n.message}</p></div></div>
                  </div>
                ))}
                {notifs.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">No notifications</p>}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[60px] z-40 bg-zinc-950/95 backdrop-blur px-4 py-2 border-b border-zinc-800/30">
        <div className="max-w-lg mx-auto flex gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedTaskId(null); setShowUpload(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${tab === t.id ? "bg-orange-500 text-zinc-950" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800"}`}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {/* ─── Upload Overlay ─── */}
            {showUpload && selectedTask && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-zinc-950/98 flex flex-col">
                <UploadOverlay task={selectedTask} onClose={() => setShowUpload(false)} onSuccess={() => { refetchTasks(); setShowUpload(false); setSelectedTaskId(null); }} />
              </motion.div>
            )}

            {/* ─── Task Detail ─── */}
            {selectedTask && !showUpload && (
              <motion.div key={`detail-${selectedTask.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
                <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} onUpload={() => setShowUpload(true)} refetchTasks={refetchTasks} />
              </motion.div>
            )}

            {/* ─── Tasks Tab ─── */}
            {tab === "tasks" && !selectedTask && (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {activeTasks.length === 0 && <div className="flex flex-col items-center py-12 text-zinc-500"><ClipboardList className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm">No tasks assigned for today</p></div>}
                {activeTasks.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl cursor-pointer hover:border-orange-500/30 active:scale-[0.98] transition-all shadow-lg shadow-black/20" onClick={() => setSelectedTaskId(t.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2"><h3 className="font-semibold text-base">{t.title}</h3><ArrowRight className="h-4 w-4 text-zinc-600 flex-shrink-0 mt-1" /></div>
                        {t.machineName && <p className="text-xs text-zinc-400 mb-2">🔧 {t.machineName}</p>}
                        <div className="flex items-center gap-2"><Badge className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge><Badge className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge>{t.dueDate && <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1"><Clock className="h-3 w-3" />{t.dueDate}</span>}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ─── Schedule Tab ─── */}
            {tab === "schedule" && !selectedTask && (
              <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {scheduleList.length === 0 && <div className="flex flex-col items-center py-12 text-zinc-500"><Calendar className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm">No schedule for today</p></div>}
                {scheduleList.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl shadow-lg shadow-black/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">{s.machineName}</h3><Badge variant="outline">{s.status}</Badge></div>
                        <div className="flex items-center gap-2 text-sm"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.shiftColor ?? "#f97316" }} /><span>{s.shiftName}</span><span className="text-zinc-500">{s.shiftStart} – {s.shiftEnd}</span></div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ─── History Tab ─── */}
            {tab === "history" && !selectedTask && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {historyTasks.length === 0 && <div className="flex flex-col items-center py-12 text-zinc-500"><History className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm">No task history yet</p></div>}
                {historyTasks.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-zinc-800/50 bg-zinc-900/80 rounded-2xl shadow-lg shadow-black/20">
                      <CardContent className="p-4"><h3 className="font-medium mb-2">{t.title}</h3><Badge className={STATUS_COLORS[t.status]}>{t.status.replace("_", " ")}</Badge></CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Task Detail ─────────────────────────────────────────
function TaskDetail({ task, onBack, onUpload, refetchTasks }: {
  task: { id: number; title: string; description: string | null; priority: string; status: string; machineName: string | null; dueDate: string | null };
  onBack: () => void; onUpload: () => void; refetchTasks: () => void;
}) {
  const startTask = trpc.factory.startTask.useMutation({ onSuccess: () => { toast.success("Task started!"); refetchTasks(); }, onError: (e) => toast.error(e.message) });
  const stepIdx = LIFECYCLE.indexOf(task.status);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition"><ChevronLeft className="h-4 w-4" />Back</button>
      <h2 className="text-xl font-bold">{task.title}</h2>
      {task.machineName && <p className="text-sm text-zinc-400">🔧 {task.machineName}</p>}
      {task.description && <p className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">{task.description}</p>}
      <div className="flex gap-2"><Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>{task.dueDate && <Badge variant="outline" className="text-zinc-400">{task.dueDate}</Badge>}</div>

      {/* Progress stepper */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-xs font-bold text-zinc-500 uppercase mb-3">Progress</p>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-zinc-800" />
          {LIFECYCLE.map((step, idx) => {
            const isCurrent = step === task.status;
            const isPast = idx <= stepIdx;
            return (
              <div key={step} className="relative flex flex-col items-center z-10">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                  isCurrent ? "bg-orange-500 border-orange-500 text-zinc-950 animate-pulse" : isPast ? "bg-emerald-600 border-emerald-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}>{isPast && !isCurrent ? "✓" : idx + 1}</div>
                <p className={`text-[9px] mt-1.5 ${isCurrent ? "text-orange-400 font-bold" : "text-zinc-600"}`}>{step.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {task.status === "assigned" && (
        <Button onClick={() => startTask.mutate({ id: task.id })} disabled={startTask.isPending} className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-400 text-zinc-950 rounded-2xl">
          {startTask.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start Task"}
        </Button>
      )}
      {task.status === "in_progress" && (
        <Button onClick={onUpload} className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl">
          <Upload className="mr-2 h-5 w-5" />Upload Proof
        </Button>
      )}
      {task.status === "waiting_review" && (
        <div className="flex items-center justify-center gap-3 py-6 text-purple-400"><Loader2 className="h-5 w-5 animate-spin" /><span className="font-medium">Waiting for Admin Review...</span></div>
      )}
      {task.status === "completed" && (
        <div className="flex items-center justify-center gap-3 py-6 text-emerald-400"><CheckCircle2 className="h-8 w-8" /><span className="text-lg font-bold">Task Approved</span></div>
      )}
      {task.status === "rejected" && (
        <div className="space-y-3"><div className="flex items-center justify-center gap-3 py-4 text-red-400"><XCircle className="h-8 w-8" /><span className="text-lg font-bold">Task Rejected</span></div>
          <Button onClick={() => startTask.mutate({ id: task.id })} disabled={startTask.isPending} className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-400 text-zinc-950 rounded-2xl">Re-upload Proof</Button>
        </div>
      )}
    </div>
  );
}

// ─── Upload Overlay ──────────────────────────────────────
function UploadOverlay({ task, onClose, onSuccess }: { task: { id: number; title: string }; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadProof = trpc.factory.uploadProof.useMutation();
  const submitProof = trpc.factory.submitTaskProof.useMutation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) { toast.error("Select a file first"); return; }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const { mediaUrl } = await uploadProof.mutateAsync({ dataBase64: base64, contentType: file.type, fileName: file.name });
      await submitProof.mutateAsync({ taskId: task.id, mediaUrl, mediaType: file.type.startsWith("video") ? "video" : "image", note: note || undefined });
      toast.success("Proof submitted!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-zinc-400"><ChevronLeft className="h-4 w-4" />Cancel</button>
        <h3 className="font-bold text-sm">Upload Proof</h3>
        <div className="w-16" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full space-y-5">
        <p className="text-xs text-zinc-500 text-center">for: <span className="text-zinc-300 font-medium">{task.title}</span></p>
        <input ref={inputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFile} />
        {!preview ? (
          <button onClick={() => inputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-3 text-zinc-500 hover:border-orange-500/50 hover:text-orange-400 transition-all active:scale-[0.98]">
            <Camera className="h-12 w-12" /><span className="text-sm font-medium">Tap to select photo or video</span>
          </button>
        ) : (
          <div className="relative">
            {file?.type.startsWith("video") ? <video src={preview} controls className="w-full rounded-2xl" /> : <img src={preview} alt="Preview" className="w-full rounded-2xl" />}
            <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-zinc-900/80 rounded-full p-1.5"><XCircle className="h-5 w-5 text-zinc-400" /></button>
          </div>
        )}
        <Textarea placeholder="Add notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="bg-zinc-900 border-zinc-800 min-h-[80px] rounded-xl" />
        {uploading && <div className="h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full animate-pulse" style={{ width: "70%" }} /></div>}
        <Button onClick={handleSubmit} disabled={!file || uploading} className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl">
          {uploading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Uploading...</> : <><Upload className="mr-2 h-5 w-5" />Submit Proof</>}
        </Button>
      </div>
    </div>
  );
}
