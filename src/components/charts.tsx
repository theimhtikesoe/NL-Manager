import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = {
  primary: "#f97316",
  blue: "#3b82f6",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#94a3b8",
};

const CHART_COLORS = [COLORS.primary, COLORS.blue, COLORS.emerald, COLORS.violet, COLORS.amber, COLORS.cyan, COLORS.red, COLORS.slate];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-card border border-border p-3 shadow-xl shadow-black/30">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-foreground">{p.value}</span>
          <span className="text-muted-foreground">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

export function TasksPerDayChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">တစ်နေ့လျှင် ပြီးစီးသော တာဝန်များ</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={COLORS.primary}
              strokeWidth={2.5}
              dot={{ fill: COLORS.primary, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: COLORS.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WorkerProductivityChart({ data }: { data: { name: string; completed: number }[] }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">ဝန်ထမ်း ထုတ်လုပ်နိုင်စွမ်း</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="completed" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MachineUtilizationChart({ data }: { data: { name: string; code: string; tasks: number; active: number }[] }) {
  const chartData = data.map((m) => ({ name: m.code, value: m.tasks }));
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">စက် အသုံးချနိုင်စွမ်း</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProofStatusChart({ data }: { data: { pending: number; approved: number; rejected: number } }) {
  const chartData = [
    { name: "စောင့်ဆိုင်း", value: data.pending, color: COLORS.amber },
    { name: "ခွင့်ပြု", value: data.approved, color: COLORS.emerald },
    { name: "ပယ်ချ", value: data.rejected, color: COLORS.red },
  ];
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">အထောက်အထား သုံးသပ်မှု အခြေအနေ</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
