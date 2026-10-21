"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { DateRow } from "../../components/radar";
import { LockedCard } from "../../components/upgrade";
import { api, errorMessage, Radar } from "../../lib/api";
import type { MessageKey } from "../../lib/messages";
import { usePreferences } from "../../lib/preferences";

const severityTone: Record<string, string> = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-600" };

export default function RadarPage() {
  const { t, number } = usePreferences();
  const [radar, setRadar] = useState<Radar | null>(null); const [error, setError] = useState("");
  useEffect(() => { api<Radar>("/radar/").then(setRadar).catch(cause => setError(errorMessage(cause, t("common.error")))); }, []);
  return <AppShell>
    <header><p className="text-sm font-bold text-teal-600">{t("radar.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("radar.title")}</h1><p className="mt-2 max-w-3xl text-slate-500">{t("radar.subtitle")}</p></header>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    {!radar ? !error && <p className="mt-8 text-slate-500">{t("common.loading")}</p> : radar.locked ? <div className="mt-8"><LockedCard title={t("radar.lockedTitle")} text={t("radar.lockedText")} /></div> : <>
      <p className="mt-4 text-sm text-slate-500">{t("radar.analyzed", { count: number(radar.analyzed) })}</p>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-6"><h2 className="font-bold">{t("radar.upcoming")}</h2>{radar.upcoming.length ? <ul className="mt-2 divide-y">{radar.upcoming.map((item, index) => <DateRow key={`${item.document_id}-${index}`} item={item} />)}</ul> : <p className="mt-6 text-sm text-slate-500">{t("radar.empty")}</p>}</div>
        <div className="card p-6"><h2 className="font-bold">{t("radar.risks")}</h2>{radar.risks.length ? <ul className="mt-3 space-y-3">{radar.risks.map((risk, index) => <li key={index} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold" dir="auto">{risk.clause}</p><span className={`status-chip shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${severityTone[risk.severity ?? "medium"]}`}>{t(`severity.${risk.severity ?? "medium"}` as MessageKey)}</span></div>{risk.risk && <p className="mt-1 text-sm leading-6 text-slate-600" dir="auto">{risk.risk}</p>}<Link className="mt-1 inline-block text-xs text-slate-400 hover:text-teal-700" href={`/documents/${risk.document_id}`} dir="auto">{risk.document_name}</Link></li>)}</ul> : <p className="mt-6 text-sm text-slate-500">{t("radar.risksEmpty")}</p>}</div>
      </section></>}
  </AppShell>;
}
