"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { api, Document, errorMessage, formatBytes } from "../../lib/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]); const [error, setError] = useState(""); const [uploading, setUploading] = useState(false);
  async function load() { try { setDocuments((await api<{ results: Document[] }>("/documents/?limit=100")).results); } catch (cause) { setError(errorMessage(cause)); } }
  useEffect(() => { void load(); }, []);
  async function upload(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(""); try { const body = new FormData(); body.append("file", file); await api<Document>("/documents/", { method: "POST", body }); await load(); } catch (cause) { setError(errorMessage(cause)); } finally { setUploading(false); event.target.value = ""; } }
  async function remove(id: string) { if (!window.confirm("Delete this document and its derived data?")) return; try { await api(`/documents/${id}/`, { method: "DELETE" }); await load(); } catch (cause) { setError(errorMessage(cause)); } }
  return <AppShell><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-teal-600">LIBRARY</p><h1 className="mt-1 text-3xl font-black">Documents</h1><p className="mt-2 text-slate-500">Files process asynchronously and stay private to your account.</p></div><label className="btn cursor-pointer">{uploading ? "Uploading…" : "Upload document"}<input className="hidden" type="file" accept=".pdf,.txt,.docx,.md,.markdown" disabled={uploading} onChange={upload} /></label></header>{error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}<section className="card mt-8 overflow-hidden"><div className="hidden grid-cols-[1fr_140px_100px_80px] gap-4 border-b px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 md:grid"><span>Name</span><span>Size</span><span>Status</span><span /></div>{documents.length ? documents.map(document => <div className="grid gap-2 border-b px-6 py-4 last:border-0 md:grid-cols-[1fr_140px_100px_80px] md:items-center" key={document.id}><Link className="font-semibold hover:text-teal-700" href={`/documents/${document.id}`}>{document.filename}</Link><span className="text-sm text-slate-500">{formatBytes(document.file_size)}</span><span><StatusBadge status={document.status} /></span><button className="text-left text-sm font-medium text-rose-600 hover:text-rose-800" onClick={() => void remove(document.id)}>Delete</button></div>) : <div className="p-12 text-center text-slate-500"><p className="font-semibold">Your library is ready.</p><p className="mt-1 text-sm">Upload PDF, TXT, DOCX, or Markdown to make it searchable.</p></div>}</section></AppShell>;
}
