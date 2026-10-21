"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { api, Collection, errorMessage } from "../../lib/api";
import { usePreferences } from "../../lib/preferences";

export default function CollectionsPage() {
  const { t, number } = usePreferences();
  const [collections, setCollections] = useState<Collection[]>([]); const [name, setName] = useState(""); const [error, setError] = useState("");
  async function load() { try { setCollections((await api<{ results: Collection[] }>("/collections/?limit=100")).results); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; try { await api("/collections/", { method: "POST", body: JSON.stringify({ name }) }); setName(""); setError(""); await load(); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  async function remove(id: string) { if (!window.confirm(t("collections.confirmDelete"))) return; try { await api(`/collections/${id}/`, { method: "DELETE" }); await load(); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  return <AppShell><header><p className="text-sm font-bold text-teal-600">{t("collections.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("collections.title")}</h1><p className="mt-2 text-slate-500">{t("collections.subtitle")}</p></header>
    <form className="card mt-8 flex flex-col gap-3 p-5 sm:flex-row" onSubmit={create}><input className="field" value={name} onChange={event => setName(event.target.value)} placeholder={t("collections.placeholder")} maxLength={120} dir="auto" /><button className="btn sm:w-36">{t("collections.create")}</button></form>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{collections.map(collection => <article className="card p-6" key={collection.id}><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold" dir="auto">{collection.name}</h2><p className="mt-2 text-sm text-slate-500">{t("collections.count", { count: number(collection.document_count) })}</p></div><button className="text-sm text-rose-600" onClick={() => void remove(collection.id)}>{t("common.delete")}</button></div></article>)}{!collections.length && <p className="text-sm text-slate-500">{t("collections.empty")}</p>}</section></AppShell>;
}
