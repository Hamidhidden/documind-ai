"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { DateRow } from "../../components/radar";
import { ProBadge } from "../../components/upgrade";
import { api, Dashboard, Document, errorMessage, Radar } from "../../lib/api";
import { usePreferences } from "../../lib/preferences";

function Kpi({ label, value, hint, progress }: Readonly<{ label: string; value: string; hint: string; progress?: number | null }>) {
  return <div className="card p-5">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
    {progress != null && <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--chart-muted)" }}><div className="h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: "var(--chart)" }} /></div>}
    <p className="mt-2 text-xs text-slate-400">{hint}</p>
  </div>;
}

function ActivityChart({ data }: Readonly<{ data: Dashboard["activity"] }>) {
  const { t, number, date } = usePreferences(); const [hover, setHover] = useState<number | null>(null); const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map(day => day.questions)); const total = data.reduce((sum, day) => sum + day.questions, 0);
  return <section className="card p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="font-bold">{t("dashboard.activity")}</h2><p className="mt-1 text-sm text-slate-500">{t("dashboard.activityTotal", { count: number(total) })}</p></div><button className="text-xs font-semibold text-teal-700" onClick={() => setTable(!table)}>{table ? t("dashboard.hideTable") : t("dashboard.showTable")}</button></div>
    {total === 0 && !table ? <p className="mt-8 py-10 text-center text-sm text-slate-500">{t("dashboard.activityEmpty")}</p> : table ?
      <table className="mt-4 w-full text-sm"><thead><tr className="border-b text-slate-400"><th className="py-2 text-start font-medium">{t("dashboard.colDate")}</th><th className="py-2 text-end font-medium">{t("dashboard.colQuestions")}</th></tr></thead><tbody>{data.map(day => <tr className="border-b last:border-0" key={day.date}><td className="py-1.5">{date(day.date)}</td><td className="py-1.5 text-end tabular-nums">{number(day.questions)}</td></tr>)}</tbody></table> :
      <div className="relative mt-6">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" /><span className="absolute -top-2.5 start-0 bg-white pe-1 text-[11px] text-slate-400 tabular-nums">{number(max)}</span>
        <div className="flex h-40 items-end" onMouseLeave={() => setHover(null)}>{data.map((day, index) => <div key={day.date} className="relative flex h-full flex-1 cursor-default items-end justify-center px-px" onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} tabIndex={0} aria-label={t("dashboard.tooltip", { date: date(day.date), count: number(day.questions) })}>
          <div className="w-full max-w-[22px] rounded-t" style={{ height: day.questions ? `${Math.max(4, (day.questions / max) * 100)}%` : "2px", background: day.questions ? "var(--chart)" : "var(--border)", opacity: hover === null || hover === index ? 1 : 0.55 }} />
          {hover === index && <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg" style={{ background: "var(--ink)", color: "var(--surface)" }}>{t("dashboard.tooltip", { date: date(day.date, "day"), count: number(day.questions) })}</div>}
        </div>)}</div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-400"><span>{date(data[0].date, "day")}</span><span>{date(data[Math.floor(data.length / 2)].date, "day")}</span><span>{date(data[data.length - 1].date, "day")}</span></div>
      </div>}
  </section>;
}

function BarList({ title, empty, rows }: Readonly<{ title: string; empty: string; rows: { key: string; label: string; value: number; display: string; href?: string }[] }>) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return <section className="card p-6"><h2 className="font-bold">{title}</h2>{rows.length ? <ul className="mt-4 space-y-3">{rows.map(row => {
    const label = <span className="truncate" dir="auto">{row.label}</span>;
    return <li key={row.key} title={`${row.label}: ${row.display}`}><div className="mb-1 flex justify-between gap-3 text-sm">{row.href ? <Link className="truncate font-medium hover:text-teal-700" href={row.href}>{label}</Link> : label}<span className="shrink-0 text-slate-500 tabular-nums">{row.display}</span></div><div className="h-2 rounded-full" style={{ background: "var(--chart-muted)" }}><div className="h-full rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: "var(--chart)" }} /></div></li>;
  })}</ul> : <p className="mt-6 text-sm text-slate-500">{empty}</p>}</section>;
}

export default function DashboardPage() {
  const { t, number, percent, date, bytes } = usePreferences();
  const [stats, setStats] = useState<Dashboard | null>(null); const [recent, setRecent] = useState<Document[]>([]); const [radar, setRadar] = useState<Radar | null>(null); const [error, setError] = useState("");
  useEffect(() => { Promise.all([api<Dashboard>("/dashboard/"), api<{ results: Document[] }>("/documents/?limit=5")]).then(([data, documents]) => { setStats(data); setRecent(documents.results); api<Radar>("/radar/").then(setRadar).catch(() => undefined); }).catch(cause => setError(errorMessage(cause, t("common.error")))); }, [t]);
  const processing = (stats?.documents.by_status.PROCESSING ?? 0) + (stats?.documents.by_status.UPLOADED ?? 0);
  return <AppShell>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-teal-600">{t("dashboard.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("dashboard.greeting")}</h1><p className="mt-1 text-sm text-slate-500">{date(new Date(), "long")}</p></div><div className="flex gap-2"><Link className="btn-secondary" href="/chat">{t("dashboard.newChat")}</Link><Link className="btn" href="/documents">{t("dashboard.upload")}</Link></div></header>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    {!stats ? !error && <p className="mt-8 text-slate-500">{t("common.loading")}</p> : <>
      {processing > 0 && <p className="mt-6 rounded-xl bg-teal-50 p-3 text-sm text-teal-700">◔ {t("dashboard.processing", { count: number(processing) })}</p>}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("kpi.documents")} value={number(stats.documents.total)} hint={t("kpi.documentsHint", { ready: number(stats.documents.by_status.READY ?? 0) })} />
        <Kpi label={t("kpi.storage")} value={bytes(stats.documents.storage_bytes)} hint={t("kpi.storageHint", { pages: number(stats.documents.pages), words: number(stats.documents.words) })} />
        <Kpi label={t("kpi.questions")} value={number(stats.questions.total)} hint={t("kpi.questionsHint", { conversations: number(stats.conversations) })} />
        <Kpi label={t("kpi.answerRate")} value={stats.questions.answer_rate == null ? t("common.empty") : percent(stats.questions.answer_rate)} hint={t("kpi.answerRateHint", { answered: number(stats.questions.answered), total: number(stats.questions.total) })} progress={stats.questions.answer_rate} />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ActivityChart data={stats.activity} />
        <section className="card p-6"><h2 className="font-bold">{t("dashboard.gaps")}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{t("dashboard.gapsHint")}</p>{stats.knowledge_gaps_locked ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><ProBadge /><p className="mt-2 leading-6">{t("dashboard.gapsLocked", { count: number(stats.knowledge_gaps_count) })}</p><Link className="mt-2 inline-block font-semibold underline" href="/billing">{t("upgrade.cta")}</Link></div> : stats.knowledge_gaps.length ? <ul className="mt-4 divide-y">{stats.knowledge_gaps.map(gap => <li key={`${gap.conversation_id}${gap.asked_at}`}><Link className="block py-2.5 hover:text-teal-700" href={`/chat?conversation=${gap.conversation_id}`}><span className="line-clamp-2 text-sm font-medium" dir="auto">{gap.question}</span><span className="text-xs text-slate-400">{date(gap.asked_at)}</span></Link></li>)}</ul> : <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">✓ {t("dashboard.gapsEmpty")}</p>}</section>
      </section>
      {radar && <section className="card mt-6 p-6"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold">{t("dashboard.deadlines")}{radar.locked && <ProBadge />}</h2><Link className="text-sm font-semibold text-teal-600" href={radar.locked ? "/billing" : "/radar"}>{radar.locked ? t("upgrade.cta") : t("common.viewAll")}</Link></div>
        {radar.locked ? <p className="mt-3 text-sm leading-6 text-slate-500">{t("radar.lockedText")}</p> : (() => { const soon = radar.upcoming.filter(item => item.days_left >= 0 && item.days_left <= 90).slice(0, 5); return soon.length ? <ul className="mt-2 divide-y">{soon.map((item, index) => <DateRow key={`${item.document_id}-${index}`} item={item} />)}</ul> : <p className="mt-3 text-sm text-slate-500">{t("dashboard.deadlinesEmpty")}</p>; })()}</section>}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <BarList title={t("dashboard.topDocs")} empty={t("dashboard.topDocsEmpty")} rows={stats.top_documents.map(doc => ({ key: doc.id, label: doc.filename, value: doc.citations, display: t("dashboard.citations", { count: number(doc.citations) }), href: `/documents/${doc.id}` }))} />
        <BarList title={t("dashboard.types")} empty={t("dashboard.recentEmpty")} rows={Object.entries(stats.documents.by_type).map(([type, count]) => ({ key: type, label: type.toUpperCase(), value: count, display: number(count) }))} />
        <section className="card p-6"><div className="flex justify-between"><h2 className="font-bold">{t("dashboard.recent")}</h2><Link className="text-sm font-semibold text-teal-600" href="/documents">{t("common.viewAll")}</Link></div><div className="mt-3 divide-y">{recent.length ? recent.map(document => <Link href={`/documents/${document.id}`} className="flex items-center justify-between gap-3 py-2.5" key={document.id}><span className="truncate text-sm font-medium" dir="auto">{document.filename}</span><StatusBadge status={document.status} /></Link>) : <p className="py-6 text-sm text-slate-500">{t("dashboard.recentEmpty")}</p>}</div></section>
      </section>
    </>}
  </AppShell>;
}
