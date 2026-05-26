
-- Workers
CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'worker' CHECK (role IN ('admin','worker')),
  department text,
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO anon, authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.workers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  color text NOT NULL DEFAULT '#f97316'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO anon, authenticated;
GRANT ALL ON public.shifts TO service_role;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code text NOT NULL UNIQUE,
  machine_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','offline')),
  location text,
  assigned_worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  last_maintenance timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO anon, authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.machines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO anon, authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Phase 6: prevent double-booking the same worker or machine on same date+shift
CREATE UNIQUE INDEX schedules_worker_date_shift_uq ON public.schedules (worker_id, date, shift_id);
CREATE UNIQUE INDEX schedules_machine_date_shift_uq ON public.schedules (machine_id, date, shift_id);
CREATE INDEX schedules_date_idx ON public.schedules (date);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','assigned','in_progress','waiting_review','completed','rejected')),
  assigned_to uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  due_date date,
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.task_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  note text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  review_note text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_proofs TO anon, authenticated;
GRANT ALL ON public.task_proofs TO service_role;
ALTER TABLE public.task_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.task_proofs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo open" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.workers (username, name, role, department) VALUES
  ('admin', 'Admin User', 'admin', 'Operations'),
  ('worker01', 'Aung Min', 'worker', 'Production Line A'),
  ('worker02', 'Hla Hla', 'worker', 'Production Line B'),
  ('worker03', 'Kyaw Soe', 'worker', 'Quality Control');

INSERT INTO public.shifts (name, start_time, end_time, color) VALUES
  ('DAY', '08:00', '20:00', '#f97316'),
  ('NIGHT', '20:00', '08:00', '#6366f1');

INSERT INTO public.machines (machine_code, machine_name, status, location) VALUES
  ('NL-001', 'Knitting Loom Alpha', 'active', 'Floor 1 - Bay A'),
  ('NL-002', 'Knitting Loom Beta', 'active', 'Floor 1 - Bay B'),
  ('NL-003', 'Dye Vat Gamma', 'maintenance', 'Floor 2 - Bay A'),
  ('NL-004', 'Cutting Station Delta', 'active', 'Floor 2 - Bay B'),
  ('NL-005', 'Packaging Line Epsilon', 'offline', 'Floor 3 - Bay A'),
  ('NL-006', 'Inspection Bench Zeta', 'active', 'Floor 3 - Bay B');

INSERT INTO public.tasks (title, description, priority, status, assigned_to, machine_id, due_date)
SELECT
  t.title, t.description, t.priority, t.status,
  (SELECT id FROM public.workers WHERE username = t.assignee),
  (SELECT id FROM public.machines WHERE machine_code = t.machine),
  CURRENT_DATE + t.due_offset
FROM (VALUES
  ('Morning calibration check', 'Verify tension and gauge before first run', 'high', 'assigned', 'worker01', 'NL-001', 0),
  ('Replace dye filter', 'Filter cartridge at 90% saturation', 'medium', 'in_progress', 'worker02', 'NL-003', 1),
  ('Quality sampling - Batch 47', 'Pull 5 samples for QC review', 'medium', 'waiting_review', 'worker03', 'NL-006', 0),
  ('Lubricate bearings', 'Standard 200hr maintenance', 'low', 'assigned', 'worker01', 'NL-002', 2),
  ('Inspect cutting blade', 'Check for wear and alignment', 'high', 'created', 'worker02', 'NL-004', 1)
) AS t(title, description, priority, status, assignee, machine, due_offset);

-- task-proofs storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-proofs', 'task-proofs', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "task-proofs public read" ON storage.objects FOR SELECT USING (bucket_id = 'task-proofs');
CREATE POLICY "task-proofs open insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'task-proofs');
CREATE POLICY "task-proofs open update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'task-proofs') WITH CHECK (bucket_id = 'task-proofs');
CREATE POLICY "task-proofs open delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'task-proofs');

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Notification triggers for proof events
CREATE OR REPLACE FUNCTION public.handle_proof_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT t.title INTO v_task_title FROM public.tasks t WHERE t.id = NEW.task_id;
    INSERT INTO public.notifications (user_id, title, message)
    SELECT w.id, 'New proof uploaded', 'Proof submitted for task: ' || COALESCE(v_task_title, 'Unknown task')
    FROM public.workers w WHERE w.role = 'admin';
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.review_status != OLD.review_status THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.uploaded_by,
      'Proof ' || NEW.review_status,
      'Your proof has been ' || NEW.review_status || CASE WHEN NEW.review_note IS NOT NULL THEN ': ' || NEW.review_note ELSE '' END
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_proof_insert_notification
  AFTER INSERT ON public.task_proofs
  FOR EACH ROW EXECUTE FUNCTION public.handle_proof_notification();

CREATE TRIGGER task_proof_update_notification
  AFTER UPDATE ON public.task_proofs
  FOR EACH ROW EXECUTE FUNCTION public.handle_proof_notification();
