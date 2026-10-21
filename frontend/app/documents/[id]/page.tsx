"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { RichText } from "../../../components/rich-text";
import { StatusBadge } from "../../../components/status-badge";
import { DueChip } from "../../../components/radar";
import { ProBadge, UpgradeNotice } from "../../../components/upgrade";
import { api, Document, errorMessage, Insight, isPlanRequired } from "../../../lib/api";
import type { MessageKey } from "../../../lib/messages";
import { usePreferences } from "../../../lib/preferences";

type SearchItem = { id: string; document_name: string; page_number: number | null; content: string; score?: number };
type Summary = { status: string; content: string; error_message: string; mode: string };
const summaryModes = ["short", "detailed", "key_points", "executive"] as const;
export default function DocumentDetailPage() {
  const { t, number, date, locale } = usePreferences();
  const params = useParams<{ id: string }>(); const id = params.id; const [document, setDocument] = useState<Document | null>(null); const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchItem[] | null>(null); const [summary, setSummary] = useState<Summary | null>(null); const [mode, setMode] = useState<(typeof summaryModes)[number]>("detailed"); const [error, setError] = useState(""); const [loadingSummary, setLoadingSummary] = useState(false); const [insight, setInsight] = useState<Insight | null>(null); const [upgrade, setUpgrade] = useState("");
  useEffect(() => { const load = async () => { try { setDocument(await api<Document>(`/documents/${id}/`)); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }; void load(); }, [id]);
  useEffect(() => { if (document?.status !== "PROCESSING" && document?.status !== "UPLOADED") return; const timer = window.setInterval(() => api<Document>(`/documents/${id}/`).then(setDocument).catch(() => undefined), 3500); return () => window.clearInterval(timer); }, [document?.status, id]);
  async function search(event: FormEvent) { event.preventDefault(); if (!query.trim()) return; try { const data = await api<{ results: SearchItem[] }>(`/search/?q=${encodeURIComponent(query)}&document_id=${id}`); setResults(data.results); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  async function summarize() { setLoadingSummary(true); setError(""); setUpgrade(""); try { setSummary(await api<Summary>(`/documents/${id}/summarize/`, { method: "POST", body: JSON.stringify({ mode }) })); } catch (cause) { (isPlanRequired(cause) ? setUpgrade : setError)(errorMessage(cause, t("common.error"))); } finally { setLoadingSummary(false); } }
  const loadInsight = () => api<Insight>(`/documents/${id}/insights/`).then(setInsight).catch(() => undefined);
  useEffect(() => { void loadInsight(); }, [id, document?.status]);
  useEffect(() => { if (insight?.status !== "PENDING") return; const timer = window.setInterval(() => void loadInsight(), 3000); return () => window.clearInterval(timer); }, [insight?.status]);
  async function analyze() { setUpgrade(""); try { setInsight(await api<Insight>(`/documents/${id}/insights/`, { method: "POST" })); } catch (cause) { (isPlanRequired(cause) ? setUpgrade : setError)(errorMessage(cause, t("common.error"))); } }
  if (!document && !error) return <AppShell><p className="text-slate-500">{t("document.loading")}</p></AppShell>;
  if (!document) return <AppShell><Link className="text-teal-700" href="/documents">{t("document.backToDocuments")}</Link><p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p></AppShell>;
  const ready = document.status === "READY";
  return <AppShell><Link href="/documents" className="text-sm font-semibold text-teal-700">{locale === "fa" ? "→" : "←"} {t("document.back")}</Link>
    <header className="mt-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="max-w-3xl break-words text-3xl font-black" dir="auto">{document.filename}</h1><p className="mt-2 text-slate-500">{document.word_count != null ? t("document.words", { count: number(document.word_count) }) : t("common.empty")} · {document.page_count != null ? t("document.pages", { count: number(document.page_count) }) : t("document.noPages")} · {date(document.created_at)}</p></div><StatusBadge status={document.status} /></header>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    {upgrade && <div className="mt-6"><UpgradeNotice message={upgrade} /></div>}
    {document.status === "FAILED" && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{t("document.failed")}</p>}
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <div className="card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{t("document.summary")}</h2><div className="flex gap-2"><select className="field w-auto py-2" value={mode} onChange={event => setMode(event.target.value as (typeof summaryModes)[number])} disabled={!ready}>{summaryModes.map(value => <option key={value} value={value}>{t(`summary.${value}` as MessageKey)}</option>)}</select><button className="btn-secondary whitespace-nowrap" disabled={!ready || loadingSummary} onClick={() => void summarize()}>{loadingSummary ? t("document.generating") : t("document.generate")}</button></div></div>
        {summary ? <div className="mt-5 text-slate-700">{summary.status === "PENDING" ? <p className="text-sm">{t("document.pending")}</p> : <RichText text={summary.content} />}</div> : <p className="mt-5 text-sm leading-7 text-slate-500">{t("document.summaryHint")}</p>}</div>
      <div className="card p-6"><h2 className="text-lg font-bold">{t("document.search")}</h2><form className="mt-4 flex gap-2" onSubmit={search}><input className="field" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("document.searchPlaceholder")} disabled={!ready} dir="auto" /><button className="btn" disabled={!ready}>{t("document.searchButton")}</button></form>
        <div className="mt-5 space-y-3">{results?.length === 0 && <p className="text-sm text-slate-500">{t("document.noResults")}</p>}{results?.map(result => <article className="rounded-xl bg-slate-50 p-3 text-sm" key={result.id}><p className="mb-1 text-xs font-bold text-teal-700">{result.page_number ? t("document.page", { page: number(result.page_number) }) : t("document.whole")}{result.score ? ` · ${t("document.match", { value: number(Math.round(result.score * 100)) })}` : ""}</p><p className="line-clamp-4 leading-7 text-slate-600" dir="auto">{result.content}</p></article>)}</div></div>
    </section>
    {ready && <InsightsPanel insight={insight} onAnalyze={() => void analyze()} />}</AppShell>;
}

function InsightsPanel({ insight, onAnalyze }: Readonly<{ insight: Insight | null; onAnalyze: () => void }>) {
  const { t, date } = usePreferences();
  const data = insight?.status === "READY" ? insight.data : null; const today = new Date(); today.setHours(0, 0, 0, 0);
  const list = (title: string, items: string[]) => <div><h3 className="text-sm font-bold text-slate-500">{title}</h3>{items.length ? <ul className="mt-2 space-y-1.5 text-sm">{items.map((item, index) => <li key={index} className="leading-6" dir="auto">{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">{t("insights.empty")}</p>}</div>;
  return <section className="card mt-6 p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold">{t("insights.title")} <ProBadge /></h2><button className="btn-secondary" disabled={insight?.status === "PENDING"} onClick={onAnalyze}>{insight?.status === "PENDING" ? t("insights.pending") : data ? t("insights.rerun") : t("insights.run")}</button></div>
    {insight?.status === "FAILED" && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{t("insights.failed")}</p>}
    {!data ? insight?.status !== "PENDING" && <p className="mt-4 text-sm text-slate-500">{t("insights.none")}</p> : <>
      {data.summary && <p className="mt-4 leading-7 text-slate-700" dir="auto">{data.summary}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list(t("insights.parties"), data.parties.map(party => [party.name, party.role].filter(Boolean).join(" · ")))}
        {list(t("insights.amounts"), data.amounts.map(amount => [amount.label, amount.value].filter(Boolean).join(": ")))}
        <div><h3 className="text-sm font-bold text-slate-500">{t("insights.dates")}</h3>{data.dates.length ? <ul className="mt-2 space-y-2 text-sm">{data.dates.map((item, index) => <li key={index} className="flex items-center justify-between gap-2"><span dir="auto">{item.label || item.text} <span className="text-xs text-slate-400">{date(item.date)}</span></span><DueChip days={Math.round((new Date(item.date).getTime() - today.getTime()) / 86400000)} /></li>)}</ul> : <p className="mt-2 text-sm text-slate-400">{t("insights.empty")}</p>}</div>
        {list(t("insights.obligations"), data.obligations.map(item => [item.party, item.obligation].filter(Boolean).join(": ")))}
        <div className="md:col-span-2"><h3 className="text-sm font-bold text-slate-500">{t("insights.risks")}</h3>{data.risks.length ? <ul className="mt-2 space-y-2">{data.risks.map((risk, index) => <li key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-start justify-between gap-2"><span className="font-semibold" dir="auto">{risk.clause}</span><span className="text-xs font-bold text-slate-500">{t(`severity.${risk.severity ?? "medium"}` as MessageKey)}</span></div>{risk.risk && <p className="mt-1 leading-6 text-slate-600" dir="auto">{risk.risk}</p>}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">{t("insights.empty")}</p>}</div>
      </div>
      <p className="mt-6 text-xs text-slate-400">{t("insights.verify")}</p></>}
  </section>;
}
