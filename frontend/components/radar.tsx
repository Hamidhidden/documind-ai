"use client";

import Link from "next/link";
import type { RadarDate } from "../lib/api";
import type { MessageKey } from "../lib/messages";
import { usePreferences } from "../lib/preferences";

export function DueChip({ days }: Readonly<{ days: number }>) {
  const { t, number } = usePreferences();
  const tone = days < 0 ? "bg-slate-100 text-slate-500" : days <= 30 ? "bg-rose-100 text-rose-700" : days <= 90 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700";
  const text = days === 0 ? t("radar.today") : days < 0 ? t("radar.overdue", { count: number(-days) }) : t("radar.daysLeft", { count: number(days) });
  return <span className={`status-chip whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{text}</span>;
}

export function DateRow({ item }: Readonly<{ item: RadarDate }>) {
  const { t, date } = usePreferences();
  return <li className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold" dir="auto">{item.label || item.text || t(`kind.${item.kind}` as MessageKey)}</p><p className="mt-0.5 text-xs text-slate-500"><span className="font-medium">{t(`kind.${item.kind}` as MessageKey)}</span> · {date(item.date)} · <Link className="hover:text-teal-700" href={`/documents/${item.document_id}`} dir="auto">{item.document_name}</Link></p></div><DueChip days={item.days_left} /></li>;
}
