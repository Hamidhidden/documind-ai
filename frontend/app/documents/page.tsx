"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { UpgradeNotice } from "../../components/upgrade";
import { api, Document, errorMessage, isPlanRequired } from "../../lib/api";
import { usePreferences } from "../../lib/preferences";

export default function DocumentsPage() {
  const { t, date, bytes } = usePreferences();
  const [documents, setDocuments] = useState<Document[]>([]); const [error, setError] = useState(""); const [uploading, setUploading] = useState(false); const [filter, setFilter] = useState(""); const [upgrade, setUpgrade] = useState("");
  async function load() { try { setDocuments((await api<{ results: Document[] }>("/documents/?limit=100")).results); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  useEffect(() => { void load(); }, []);
  const pending = documents.some(document => document.status === "UPLOADED" || document.status === "PROCESSING");
  useEffect(() => { if (!pending) return; const timer = window.setInterval(() => void load(), 3500); return () => window.clearInterval(timer); }, [pending]);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); if (!files.length) return; setUploading(true); setError("");
    try { for (const file of files) { const body = new FormData(); body.append("file", file); await api<Document>("/documents/", { method: "POST", body }); } await load(); }
    catch (cause) { if (isPlanRequired(cause)) setUpgrade(errorMessage(cause)); else setError(errorMessage(cause, t("common.error"))); await load(); } finally { setUploading(false); event.target.value = ""; }
  }
  async function remove(id: string) { if (!window.confirm(t("documents.confirmDelete"))) return; try { await api(`/documents/${id}/`, { method: "DELETE" }); await load(); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  const visible = documents.filter(document => document.filename.toLowerCase().includes(filter.trim().toLowerCase()));
  const columns = "md:grid-cols-[1fr_120px_130px_130px_64px]";
  return <AppShell><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-teal-600">{t("documents.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("documents.title")}</h1><p className="mt-2 text-slate-500">{t("documents.subtitle")}</p></div><label className="btn cursor-pointer">{uploading ? t("documents.uploading") : t("documents.upload")}<input className="hidden" type="file" multiple accept=".pdf,.txt,.docx,.md,.markdown" disabled={uploading} onChange={upload} /></label></header>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    {upgrade && <div className="mt-6"><UpgradeNotice message={upgrade} /></div>}
    {documents.length > 5 && <input className="field mt-6 max-w-sm" value={filter} onChange={event => setFilter(event.target.value)} placeholder={t("documents.filter")} dir="auto" />}
    <section className="card mt-6 overflow-hidden"><div className={`hidden gap-4 border-b px-6 py-4 text-xs font-bold text-slate-400 md:grid ${columns}`}><span>{t("documents.name")}</span><span>{t("documents.size")}</span><span>{t("documents.added")}</span><span>{t("documents.status")}</span><span /></div>
      {visible.length ? visible.map(document => <div className={`grid gap-2 border-b px-6 py-4 last:border-0 md:items-center ${columns}`} key={document.id}><Link className="truncate font-semibold hover:text-teal-700" dir="auto" href={`/documents/${document.id}`}>{document.filename}</Link><span className="text-sm text-slate-500">{bytes(document.file_size)}</span><span className="text-sm text-slate-500">{date(document.created_at)}</span><span><StatusBadge status={document.status} /></span><button className="text-start text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => void remove(document.id)}>{t("common.delete")}</button></div>)
        : <div className="p-12 text-center text-slate-500"><p className="font-semibold">{t("documents.empty")}</p><p className="mt-1 text-sm">{t("documents.emptyHint")}</p></div>}
    </section></AppShell>;
}
