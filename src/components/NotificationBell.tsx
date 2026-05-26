import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/nl.functions";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const notificationsQO = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => getNotifications(),
});

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const notifications = useQuery(notificationsQO);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const unreadCount = (notifications.data ?? []).filter((n: any) => !n.read_status).length;

  const refetch = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          refetch();
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as any;
            if (!newNotif.read_status) {
              toast(newNotif.title, { description: newNotif.message });
            }
          }
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [refetch]);

  const readMutation = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => refetch(),
  });

  const readAllMutation = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => { refetch(); setOpen(false); },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center size-9 rounded-xl bg-muted/50 hover:bg-accent transition-colors"
      >
        <Bell className="size-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl bg-card border border-border shadow-xl shadow-black/30 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <p className="text-sm font-semibold">အကြောင်းကြားချက်များ</p>
                {unreadCount > 0 && (
                  <button
                    onClick={() => readAllMutation.mutate()}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <CheckCheck className="size-3.5" /> အားလုံးဖတ်ပြီး မှတ်မည်
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {(notifications.data ?? []).length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">အကြောင်းကြားချက် မရှိသေးပါ</div>
                ) : (
                  (notifications.data ?? []).map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read_status && readMutation.mutate(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                        n.read_status ? "opacity-60" : "bg-primary/5"
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.read_status ? (
                          <Check className="size-3.5 text-muted-foreground" />
                        ) : (
                          <span className="block size-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
