import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// ── Workers ─────────────────────────────────────────────
export const getWorkers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("workers")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addWorker = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      username: z.string().min(2),
      name: z.string().min(1),
      role: z.enum(["admin", "worker"]).default("worker"),
      department: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("workers")
      .insert({
        username: data.username.toLowerCase(),
        name: data.name,
        role: data.role,
        department: data.department ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWorker = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("workers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Machines ────────────────────────────────────────────
export const getMachines = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("machines")
    .select("*")
    .order("machine_code");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const addMachine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      machine_code: z.string().min(1),
      machine_name: z.string().min(1),
      status: z.enum(["active", "maintenance", "offline"]).default("active"),
      location: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin.from("machines").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMachineStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "maintenance", "offline"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("machines")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMachine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("machines").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Shifts ──────────────────────────────────────────────
export const getShifts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("shifts").select("*").order("start_time");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ── Schedules ───────────────────────────────────────────
export const getSchedules = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("schedules")
    .select("*, worker:workers(id,name,username), machine:machines(id,machine_code,machine_name), shift:shifts(id,name,color,start_time,end_time)")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
});

export const assignSchedule = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      worker_id: z.string().uuid(),
      machine_id: z.string().uuid(),
      shift_id: z.string().uuid(),
      date: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    // Phase 6: explicit conflict detection (also enforced by unique indexes)
    const { data: conflicts } = await supabaseAdmin
      .from("schedules")
      .select("id,worker_id,machine_id")
      .eq("date", data.date)
      .eq("shift_id", data.shift_id)
      .or(`worker_id.eq.${data.worker_id},machine_id.eq.${data.machine_id}`);
    if (conflicts && conflicts.length > 0) {
      const c: any = conflicts[0];
      const reason =
        c.worker_id === data.worker_id && c.machine_id === data.machine_id
          ? "Worker and machine are both already booked for this shift"
          : c.worker_id === data.worker_id
          ? "Worker is already booked for this shift on this date"
          : "Machine is already booked for this shift on this date";
      throw new Error(`Schedule conflict: ${reason}`);
    }
    const { data: row, error } = await supabaseAdmin.from("schedules").insert(data).select().single();
    if (error) {
      if (error.code === "23505") throw new Error("Schedule conflict: already booked for this shift");
      throw new Error(error.message);
    }
    return row;
  });

export const deleteSchedule = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Tasks ───────────────────────────────────────────────
export const getTasks = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*, assignee:workers!tasks_assigned_to_fkey(id,name,username), machine:machines(id,machine_code,machine_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
});

export const getTasksForWorker = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: worker } = await supabaseAdmin
      .from("workers")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (!worker) return [];
    const { data: rows, error } = await supabaseAdmin
      .from("tasks")
      .select("*, machine:machines(id,machine_code,machine_name)")
      .eq("assigned_to", worker.id)
      .order("due_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

export const addTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      assigned_to: z.string().uuid().optional().nullable(),
      machine_id: z.string().uuid().optional().nullable(),
      due_date: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const status = data.assigned_to ? "assigned" : "created";
    const { data: row, error } = await supabaseAdmin.from("tasks").insert({ ...data, status }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["created", "assigned", "in_progress", "waiting_review", "completed", "rejected"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("tasks").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Task Proofs ─────────────────────────────────────────
export const getProofs = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("task_proofs")
    .select("*, task:tasks(id,title,machine:machines(machine_code,machine_name)), uploader:workers!task_proofs_uploaded_by_fkey(name,username)")
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
});

export const uploadProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      task_id: z.string().uuid(),
      uploader_username: z.string(),
      media_url: z.string().min(1),
      media_type: z.enum(["image", "video"]).default("image"),
      note: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: worker } = await supabaseAdmin
      .from("workers").select("id").eq("username", data.uploader_username).maybeSingle();
    if (!worker) throw new Error("Worker not found");
    const { data: row, error } = await supabaseAdmin.from("task_proofs").insert({
      task_id: data.task_id,
      uploaded_by: worker.id,
      media_url: data.media_url,
      media_type: data.media_type,
      note: data.note ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("tasks").update({ status: "waiting_review" }).eq("id", data.task_id);
    return row;
  });

export const reviewProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      review_status: z.enum(["approved", "rejected"]),
      review_note: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: proof, error: pErr } = await supabaseAdmin
      .from("task_proofs")
      .update({ review_status: data.review_status, review_note: data.review_note ?? null })
      .eq("id", data.id)
      .select("task_id")
      .single();
    if (pErr) throw new Error(pErr.message);
    if (proof?.task_id) {
      await supabaseAdmin
        .from("tasks")
        .update({ status: data.review_status === "approved" ? "completed" : "rejected" })
        .eq("id", proof.task_id);
    }
    return { ok: true };
  });

// ── Analytics ───────────────────────────────────────────
export const getAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      days: z.number().min(1).max(90).default(14),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceStr = since.toISOString();

    const [
      { data: tasksCompleted },
      { data: workersRaw },
      { data: machinesRaw },
      { data: proofsRaw },
    ] = await Promise.all([
      supabaseAdmin
        .from("tasks")
        .select("created_at,status")
        .gte("created_at", sinceStr)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("tasks")
        .select("status,assigned_to,workers(name)")
        .eq("status", "completed")
        .not("assigned_to", "is", null),
      supabaseAdmin
        .from("tasks")
        .select("status,machine_id,machines(machine_code,machine_name)")
        .not("machine_id", "is", null),
      supabaseAdmin
        .from("task_proofs")
        .select("review_status,uploaded_at")
        .gte("uploaded_at", sinceStr),
    ]);

    // Tasks per day
    const daysMap = new Map<string, number>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daysMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of tasksCompleted ?? []) {
      if (t.status === "completed") {
        const day = t.created_at.slice(0, 10);
        daysMap.set(day, (daysMap.get(day) ?? 0) + 1);
      }
    }
    const tasksPerDay = Array.from(daysMap.entries()).map(([date, count]) => ({ date, count }));

    // Worker productivity
    const workerMap = new Map<string, { name: string; completed: number }>();
    for (const w of workersRaw ?? []) {
      const name = (w.workers as any)?.name ?? "Unknown";
      const key = name;
      workerMap.set(key, { name: key, completed: (workerMap.get(key)?.completed ?? 0) + 1 });
    }
    const workerProductivity = Array.from(workerMap.values())
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);

    // Machine utilization
    const machineMap = new Map<string, { name: string; code: string; tasks: number; active: number }>();
    for (const m of machinesRaw ?? []) {
      const code = (m.machines as any)?.machine_code ?? "—";
      const name = (m.machines as any)?.machine_name ?? "Unknown";
      const key = code;
      const existing = machineMap.get(key);
      machineMap.set(key, {
        name,
        code,
        tasks: (existing?.tasks ?? 0) + 1,
        active: (existing?.active ?? 0) + (m.status === "active" || m.status === "assigned" || m.status === "in_progress" || m.status === "waiting_review" ? 1 : 0),
      });
    }
    const machineUtilization = Array.from(machineMap.values())
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 10);

    // Proofs by status
    const proofStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const p of proofsRaw ?? []) {
      if (p.review_status in proofStatus) {
        proofStatus[p.review_status as keyof typeof proofStatus]++;
      }
    }

    return {
      tasksPerDay,
      workerProductivity,
      machineUtilization,
      proofStatus,
    };
  });

// ── Stats ───────────────────────────────────────────────
export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const [w, m, t, p] = await Promise.all([
    supabaseAdmin.from("workers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("machines").select("id,status"),
    supabaseAdmin.from("tasks").select("id,status"),
    supabaseAdmin.from("task_proofs").select("id,review_status"),
  ]);
  const machines = m.data ?? [];
  const tasks = t.data ?? [];
  const proofs = p.data ?? [];
  return {
    totalWorkers: w.count ?? 0,
    totalMachines: machines.length,
    machinesByStatus: {
      active: machines.filter((x: any) => x.status === "active").length,
      maintenance: machines.filter((x: any) => x.status === "maintenance").length,
      offline: machines.filter((x: any) => x.status === "offline").length,
    },
    activeTasks: tasks.filter((x: any) =>
      ["assigned", "in_progress", "waiting_review"].includes(x.status),
    ).length,
    completedTasks: tasks.filter((x: any) => x.status === "completed").length,
    pendingReviews: proofs.filter((x: any) => x.review_status === "pending").length,
  };
});

// ── Notifications ───────────────────────────────────────
export const getNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("notifications").update({ read_status: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { error } = await supabaseAdmin.from("notifications").update({ read_status: true }).eq("read_status", false);
  if (error) throw new Error(error.message);
  return { ok: true };
});
