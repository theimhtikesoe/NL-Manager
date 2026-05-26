import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTasksForWorker, updateTaskStatus, uploadProof, getWorkers } from "@/lib/nl.functions";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Wrench, Loader2, Upload, CheckCircle2, ClipboardList, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/worker/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `Workspace — ${params.username} — NL Manager` },
      { name: "description", content: "ဝန်ထမ်း တာဝန်စာရင်း၊ စက်အခြေအနေနှင့် အထောက်အထား upload။" },
    ],
  }),
  component: WorkerWorkspace,
});

function WorkerWorkspace() {
  const { username } = Route.useParams();
  const qc = useQueryClient();
  const tasksQO = queryOptions({
    queryKey: ["worker-tasks", username],
    queryFn: () => getTasksForWorker({ data: { username } }),
  });
  const workersQO = queryOptions({ queryKey: ["workers"], queryFn: () => getWorkers() });
  const tasks = useQuery(tasksQO);
  const workers = useQuery(workersQO);
  const me = (workers.data ?? []).find((w: any) => w.username === username);

  const update = useServerFn(updateTaskStatus);
  const upd = useMutation({
    mutationFn: (v: { id: string; status: any }) => update({ data: v }),
    onSuccess: (_d, v) => {
      const label =
        v.status === "in_progress" ? "တာဝန် စတင်ပြီး" :
        v.status === "completed" ? "တာဝန် ပြီးစီး" :
        "တာဝန် update လုပ်ပြီး";
      toast.success(label);
      qc.invalidateQueries({ queryKey: ["worker-tasks", username] });
    },
    onError: (e: any) => toast.error(e.message ?? "Update မအောင်မြင်"),
  });

  const counts = {
    assigned: (tasks.data ?? []).filter((t: any) => t.status === "assigned").length,
    in_progress: (tasks.data ?? []).filter((t: any) => t.status === "in_progress").length,
    waiting: (tasks.data ?? []).filter((t: any) => t.status === "waiting_review").length,
    done: (tasks.data ?? []).filter((t: any) => t.status === "completed").length,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-background"
    >
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15">
              <Activity className="size-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">NL Manager</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">ဝန်ထမ်း Workspace</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
              <div className="flex size-7 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                <Wrench className="size-3.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold leading-none">{me?.name ?? username}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{me?.department ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "တာဝန်ပေးထား", value: counts.assigned, color: "bg-blue-500/10 text-blue-400 ring-blue-500/20" },
            { label: "လုပ်ဆောင်နေ", value: counts.in_progress, color: "bg-amber-500/10 text-amber-400 ring-amber-500/20" },
            { label: "သုံးသပ်ဆဲ", value: counts.waiting, color: "bg-violet-500/10 text-violet-400 ring-violet-500/20" },
            { label: "ပြီးစီး", value: counts.done, color: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl p-4 ring-1 ${s.color}`}
            >
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs font-medium mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="size-4" /> ကျွန်ုပ်၏ တာဝန်များ
          </h2>
          {tasks.isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="rounded-2xl border border-border bg-card p-5">
                  <Skeleton className="h-5 w-1/2 mb-3" />
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </li>
              ))}
            </ul>
          ) : (tasks.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <CheckCircle2 className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">ပြီးပြည့်စုံပါပြီ</p>
              <p className="text-xs text-muted-foreground mt-1">လောလောဆယ် တာဝန် မရှိပါ</p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {(tasks.data ?? []).map((t: any, i: number) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <TaskCard
                      task={t}
                      username={username}
                      workerId={me?.id}
                      onChange={() => qc.invalidateQueries({ queryKey: ["worker-tasks", username] })}
                      onStatus={(s) => upd.mutate({ id: t.id, status: s })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </main>
    </motion.div>
  );
}

function TaskCard({
  task, username, workerId, onChange, onStatus,
}: {
  task: any; username: string; workerId?: string; onChange: () => void; onStatus: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const upload = useServerFn(uploadProof);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("ဖိုင်သည် 10 MB အောက် ဖြစ်ရမည်");
      return;
    }
    const type: "image" | "video" = f.type.startsWith("video") ? "video" : "image";
    setMediaType(type);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
      const path = `${task.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("task-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("task-proofs").getPublicUrl(path);
      await upload({
        data: {
          task_id: task.id,
          uploader_username: username,
          media_url: pub.publicUrl,
          media_type: mediaType,
          note: note || null,
        },
      });
      toast.success("သုံးသပ်ရန် တင်ပြီးပါပြီ");
      onChange();
      setOpen(false);
      setNote("");
      setFile(null);
      setPreviewUrl("");
    } catch (e: any) {
      toast.error(e.message ?? "Upload မအောင်မြင်");
    } finally {
      setUploading(false);
    }
  };

  const priorityCls =
    task.priority === "high"
      ? "border-red-500/40 bg-red-500/5"
      : task.priority === "medium"
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-border";

  return (
    <motion.li
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`rounded-2xl border bg-card p-5 ${priorityCls} transition-shadow hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold">{task.title}</h3>
            {task.priority === "high" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                <AlertTriangle className="size-3" />မြင့်
              </span>
            )}
          </div>
          {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {task.machine && (
              <span className="font-mono">
                {task.machine.machine_code} — {task.machine.machine_name}
              </span>
            )}
            {task.due_date && <span>ပြီးရမည် {task.due_date}</span>}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 font-semibold ring-1 ${
                task.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                  : task.status === "waiting_review"
                  ? "bg-violet-500/15 text-violet-400 ring-violet-500/30"
                  : task.status === "in_progress"
                  ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
                  : task.status === "rejected"
                  ? "bg-red-500/15 text-red-400 ring-red-500/30"
                  : "bg-blue-500/15 text-blue-400 ring-blue-500/30"
              }`}
            >
              {task.status === "completed" ? "ပြီးစီး" : task.status === "waiting_review" ? "သုံးသပ်ဆဲ" : task.status === "in_progress" ? "လုပ်ဆောင်နေ" : task.status === "rejected" ? "ပယ်ချ" : task.status === "assigned" ? "တာဝန်ပေးထား" : task.status}
            </span>
          </div>
        </div>
      </div>

      {task.status !== "completed" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {task.status === "assigned" && (
            <Button size="sm" variant="outline" onClick={() => onStatus("in_progress")}>
              စတင်မည်
            </Button>
          )}
          {(task.status === "in_progress" || task.status === "assigned" || task.status === "rejected") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!workerId}>
                  <Upload className="size-4 mr-1" />အထောက်အထား တင်မည်
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>စစ်ဆေးမှု အထောက်အထား Upload</DialogTitle>
                  <DialogDescription>
                    {task.title} · {task.machine?.machine_code}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFile}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:font-medium"
                  />
                  {previewUrl && (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden">
                      {mediaType === "video" ? (
                        <video src={previewUrl} controls className="w-full h-full object-contain" />
                      ) : (
                        <img src={previewUrl} className="w-full h-full object-contain" alt="preview" />
                      )}
                    </div>
                  )}
                  <Textarea
                    placeholder="အက်ဒမင်အတွက် မှတ်ချက် (ရွေးချယ်)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">အများဆုံး 10 MB · ဓာတ်ပုံ နှင့် ဗီဒီယို</p>
                </div>
                <DialogFooter>
                  <Button onClick={submit} disabled={uploading || !file}>
                    {uploading && <Loader2 className="size-4 mr-1 animate-spin" />}
                    {uploading ? "Upload တင်နေ…" : "သုံးသပ်ရန် တင်မည်"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </motion.li>
  );
}
