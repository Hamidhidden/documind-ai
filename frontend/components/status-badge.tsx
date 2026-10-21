const labels: Record<string, string> = { READY: "آماده", PROCESSING: "در حال پردازش", UPLOADED: "در صف پردازش", FAILED: "ناموفق" };
export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const colors: Record<string, string> = { READY: "bg-emerald-100 text-emerald-700", PROCESSING: "bg-amber-100 text-amber-700", UPLOADED: "bg-sky-100 text-sky-700", FAILED: "bg-rose-100 text-rose-700" };
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{labels[status] ?? status}</span>;
}
