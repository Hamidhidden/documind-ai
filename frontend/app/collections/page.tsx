"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { api, Collection, errorMessage } from "../../lib/api";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]); const [name, setName] = useState(""); const [error, setError] = useState("");
  async function load() { try { setCollections((await api<{ results: Collection[] }>("/collections/?limit=100")).results); } catch (cause) { setError(errorMessage(cause)); } }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; try { await api("/collections/", { method: "POST", body: JSON.stringify({ name }) }); setName(""); await load(); } catch (cause) { setError(errorMessage(cause)); } }
  async function remove(id: string) { if (!window.confirm("Delete this collection? Documents will remain in your library.")) return; try { await api(`/collections/${id}/`, { method: "DELETE" }); await load(); } catch (cause) { setError(errorMessage(cause)); } }
  return <AppShell><header><p className="text-sm font-bold text-teal-600">ORGANIZE</p><h1 className="mt-1 text-3xl font-black">Collections</h1><p className="mt-2 text-slate-500">Group related documents for focused retrieval and research.</p></header><form className="card mt-8 flex flex-col gap-3 p-5 sm:flex-row" onSubmit={create}><input className="field" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Q3 Research" maxLength={120} /><button className="btn sm:w-36">Create</button></form>{error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}<section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{collections.map(collection => <article className="card p-6" key={collection.id}><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold">{collection.name}</h2><p className="mt-2 text-sm text-slate-500">{collection.document_count} {collection.document_count === 1 ? "document" : "documents"}</p></div><button className="text-sm text-rose-600" onClick={() => void remove(collection.id)}>Delete</button></div></article>)}{!collections.length && <p className="text-sm text-slate-500">Collections make multi-document questions easier to manage.</p>}</section></AppShell>;
}

