// CSV export utility (client-side)
function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: { key: string; label: string; get?: (row: T) => unknown }[],
) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => escapeCell(c.get ? c.get(r) : r[c.key]))
        .join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `${filename}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
