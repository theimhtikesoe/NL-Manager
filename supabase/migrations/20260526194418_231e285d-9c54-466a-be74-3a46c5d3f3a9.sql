ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to auto-notify on task proof events
CREATE OR REPLACE FUNCTION public.handle_proof_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_name TEXT;
  v_task_title TEXT;
  v_admin_ids UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify admins when worker uploads proof
    SELECT t.title INTO v_task_title
    FROM public.tasks t WHERE t.id = NEW.task_id;
    
    -- Insert notification for all (demo mode: no auth filter)
    INSERT INTO public.notifications (user_id, title, message)
    SELECT w.id, 'New proof uploaded', 'Proof submitted for task: ' || COALESCE(v_task_title, 'Unknown task')
    FROM public.workers w WHERE w.role = 'admin';
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.review_status != OLD.review_status THEN
    -- Notify worker when proof is reviewed
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

-- Create triggers
CREATE TRIGGER task_proof_insert_notification
  AFTER INSERT ON public.task_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_proof_notification();

CREATE TRIGGER task_proof_update_notification
  AFTER UPDATE ON public.task_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_proof_notification();