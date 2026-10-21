"use client";

import { usePreferences } from "../lib/preferences";
import type { MessageKey } from "../lib/messages";

const colors: Record<string, string> = { READY: "bg-emerald-100 text-emerald-700", PROCESSING: "bg-amber-100 text-amber-700", UPLOADED: "bg-sky-100 text-sky-700", FAILED: "bg-rose-100 text-rose-700" };
const icons: Record<string, string> = { READY: "✓", PROCESSING: "◔", UPLOADED: "…", FAILED: "!" };
export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const { t } = usePreferences();
  return <span className={`status-chip inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${colors[status] ?? "bg-slate-100 text-slate-600"}`}><span aria-hidden>{icons[status]}</span>{t(`status.${status}` as MessageKey)}</span>;
}
