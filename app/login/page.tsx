"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, User, ArrowRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../client/src/lib/trpc";
import { useAuth } from "../../client/src/_core/hooks/useAuth";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") router.replace("/admin");
      else router.replace(`/${user.username}`);
    }
  }, [user, loading, router]);

  const onSubmit = async (data: LoginValues) => {
    setIsSubmitting(true);
    try {
      const res = await loginMutation.mutateAsync({
        username: data.username,
        password: data.password,
      });

      // Save credentials to local storage
      localStorage.setItem("nl_token", res.token);
      localStorage.setItem("nl_user", JSON.stringify(res.user));
      
      toast.success("Login successful!");
      
      // Redirect based on role
      if (res.user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = `/${res.user.username}`;
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading || user) return null; // Avoid flashing login screen if authenticated

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[60%] rounded-full bg-orange-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="z-10 w-full max-w-md px-6"
      >
        <div className="mb-10 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-orange-400 mb-6 shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)]"
          >
            <Activity className="h-8 w-8 text-zinc-950" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold tracking-tight text-zinc-100"
          >
            NL Manager
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-500 mt-2 text-sm uppercase tracking-widest font-medium"
          >
            Workforce Portal
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-b from-orange-500/20 to-orange-500/0 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
          
          <div className="relative bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                      {...register("username")}
                      placeholder="Username"
                      className="w-full h-14 bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                    />
                  </div>
                  <AnimatePresence>
                    {errors.username && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-red-400 pl-2">
                        {errors.username.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                      {...register("password")}
                      type="password"
                      placeholder="Password"
                      className="w-full h-14 bg-zinc-950/50 border border-zinc-800 rounded-2xl pl-12 pr-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                    />
                  </div>
                  <AnimatePresence>
                    {errors.password && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs text-red-400 pl-2">
                        {errors.password.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full h-14 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-zinc-600 text-xs mt-8"
        >
          Secure Access Portal · Version 2.0
        </motion.p>
      </motion.div>
    </div>
  );
}
