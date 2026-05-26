import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Shield, Wrench, ArrowRight, Cpu, ClipboardList, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NL Manager — စက်ရုံ ထိန်းချုပ်မှု စင်တာ" },
      { name: "description", content: "ဝန်ထမ်းများ၊ စက်များ၊ အလှည့်ဆိုင်းများနှင့် စစ်ဆေးမှု workflow များကို စက်မှု dashboard တစ်ခုတည်းမှ စီမံပါ။" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur-md sticky top-0 z-10 bg-background/80">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">NL Manager</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">ထိန်းချုပ်မှု စင်တာ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-[11px] font-mono text-muted-foreground">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            DEMO မုဒ်
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/30 mb-6">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            စက်မှု လုပ်ငန်းခွင် Platform
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            စက်ရုံအလုပ်ခွင်ကို
            <span className="block text-primary">ထိန်းချုပ်နိုင်ပြီ။</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            အလှည့်ဆိုင်းသတ်မှတ်ခြင်း၊ အလုပ်တာဝန်ပေးခြင်း၊ စစ်ဆေးမှု အထောက်အထားများ ပြန်လည်သုံးသပ်ခြင်းနှင့် စက်အခြေအနေကို real-time ဖြင့် စောင့်ကြည့်ပါ။
            အခန်းကဏ္ဍ တစ်ခုကို ရွေးချယ်ပါ။
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <Link to="/admin" className="group rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20 p-8 hover:ring-primary/50 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/20">
                <Shield className="size-6 text-primary" />
              </div>
              <ArrowRight className="size-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold">အက်ဒမင် Dashboard</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              အပြည့်အဝ ထိန်းချုပ်မှု စင်တာ။ ဝန်ထမ်းများ၊ စက်များ၊ အလှည့်ဆိုင်းများ၊ အလုပ်တာဝန်များ စီမံပြီး စစ်ဆေးမှု အထောက်အထားများကို သုံးသပ်ပါ။
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Dashboard", "ဝန်ထမ်းများ", "စက်များ", "အလှည့်များ", "သုံးသပ်ချက်", "Grid"].map((t) => (
                <span key={t} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">{t}</span>
              ))}
            </div>
          </Link>

          <Link to="/worker/$username" params={{ username: "worker01" }} className="group rounded-3xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 ring-1 ring-cyan-500/20 p-8 hover:ring-cyan-500/50 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20">
                <Wrench className="size-6 text-cyan-400" />
              </div>
              <ArrowRight className="size-5 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold">ဝန်ထမ်း Workspace</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              သင့်တာဝန်များ၊ သင့်စက်များ၊ သင့်အလှည့်များ။ စစ်ဆေးမှု အထောက်အထား upload တင်ပြီး တိုးတက်မှု အခြေအနေ update လုပ်ပါ။
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["ကျွန်ုပ်တာဝန်များ", "အထောက်အထား Upload", "ကျွန်ုပ်အလှည့်များ"].map((t) => (
                <span key={t} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">{t}</span>
              ))}
            </div>
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Cpu, label: "စက် အခြေအနေ Grid", desc: "လုပ်ငန်းလိုင်းတိုင်းကို တိုက်ရိုက် စောင့်ကြည့်" },
            { icon: ClipboardList, label: "အထောက်အထား-အခြေပြု သုံးသပ်ချက်", desc: "ဓာတ်ပုံ / ဗီဒီယို စစ်ဆေးမှု workflow" },
            { icon: BarChart3, label: "လုပ်ငန်း Analytics", desc: "စောင့်ဆိုင်း၊ ပြီးစီး၊ အခြေအနေအလိုက်" },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="rounded-2xl bg-card border border-border p-5">
                <Icon className="size-5 text-primary mb-3" />
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground">
          အောက်ညာဘက်ထောင့်ရှိ Demo widget ဖြင့် Admin နှင့် Worker view များ ပြောင်းနိုင်ပါသည်။
        </p>
      </main>
    </div>
  );
}
