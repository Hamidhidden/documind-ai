"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { RichText } from "../../components/rich-text";
import { UpgradeNotice } from "../../components/upgrade";
import { api, Citation, Conversation, errorMessage, isPlanRequired, Message } from "../../lib/api";
import type { MessageKey } from "../../lib/messages";
import { usePreferences } from "../../lib/preferences";

function Sources({ sources, open, onToggle }: Readonly<{ sources: Citation[]; open: number | null; onToggle: (index: number) => void }>) {
  const { t, number } = usePreferences();
  return <div className="mt-3 border-t border-slate-200 pt-3 text-xs"><p className="font-bold text-slate-500">{t("chat.sources")}</p><ol className="mt-2 space-y-1.5">{sources.map((source, index) => <li key={source.chunk_id}>
    <button type="button" onClick={() => onToggle(index + 1)} className="flex w-full items-start gap-2 text-start"><span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-teal-50 px-1 font-bold text-teal-700">{number(index + 1)}</span><span className="pt-0.5" dir="auto">{source.document_name}{source.page ? ` · ${t("chat.page", { page: number(source.page) })}` : ""}</span></button>
    {open === index + 1 && source.excerpt && <p className="mt-1.5 rounded-lg bg-white p-2.5 leading-6 text-slate-600" dir="auto">{source.excerpt}…</p>}
  </li>)}</ol></div>;
}

function AssistantMessage({ message }: Readonly<{ message: Message }>) {
  const { t } = usePreferences(); const [open, setOpen] = useState<number | null>(null); const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(message.content); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
  return <article className="max-w-3xl rounded-2xl bg-slate-100 p-4 text-slate-800">
    <RichText text={message.content} onCite={index => setOpen(open === index ? null : index)} />
    {message.sources.length > 0 && <Sources sources={message.sources} open={open} onToggle={index => setOpen(open === index ? null : index)} />}
    <button type="button" onClick={() => void copy()} className="mt-2 text-xs text-slate-400 hover:text-slate-600">{copied ? t("chat.copied") : t("chat.copy")}</button>
  </article>;
}

export default function ChatPage() {
  const { t } = usePreferences();
  const [conversations, setConversations] = useState<Conversation[]>([]); const [active, setActive] = useState<string | null>(null); const [messages, setMessages] = useState<Message[]>([]); const [question, setQuestion] = useState(""); const [error, setError] = useState(""); const [sending, setSending] = useState(false); const [upgrade, setUpgrade] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const title = (chat: Conversation) => chat.title === "New conversation" ? t("chat.newTitle") : chat.title;
  async function loadConversations() { try { const response = await api<{ results: Conversation[] }>("/conversations/?limit=100"); setConversations(response.results); const requested = new URLSearchParams(window.location.search).get("conversation"); if (!active) setActive(response.results.find(item => item.id === requested)?.id ?? response.results[0]?.id ?? null); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  useEffect(() => { void loadConversations(); }, []);
  useEffect(() => { if (!active) { setMessages([]); return; } api<Message[]>(`/conversations/${active}/messages/`).then(setMessages).catch(cause => setError(errorMessage(cause, t("common.error")))); }, [active]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);
  async function newConversation() { try { const item = await api<Conversation>("/conversations/", { method: "POST", body: JSON.stringify({ title: "New conversation" }) }); await loadConversations(); setActive(item.id); setMessages([]); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  async function ask(content: string) {
    if (!content.trim() || sending) return; setSending(true); setError("");
    try {
      let id = active; if (!id) { const item = await api<Conversation>("/conversations/", { method: "POST", body: JSON.stringify({ title: "New conversation" }) }); id = item.id; setActive(id); }
      const userMessage: Message = { id: crypto.randomUUID(), role: "user", content, sources: [], created_at: new Date().toISOString() };
      setMessages(previous => [...previous, userMessage]); setQuestion("");
      const reply = await api<Message>(`/conversations/${id}/messages/`, { method: "POST", body: JSON.stringify({ content }) });
      setMessages(previous => [...previous, reply]); await loadConversations();
    } catch (cause) { if (isPlanRequired(cause)) { setUpgrade(errorMessage(cause)); setMessages(previous => previous.slice(0, -1)); setQuestion(content); } else setError(errorMessage(cause, t("common.error"))); } finally { setSending(false); }
  }
  const submit = (event: FormEvent) => { event.preventDefault(); void ask(question); };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); } };
  const suggestions: MessageKey[] = ["chat.suggestion1", "chat.suggestion2", "chat.suggestion3"];
  return <AppShell><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-teal-600">{t("chat.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("chat.title")}</h1></div><button className="btn-secondary" onClick={() => void newConversation()}>{t("chat.new")}</button></header>
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    {upgrade && <div className="mt-6"><UpgradeNotice message={upgrade} /></div>}
    <section className="card mt-8 grid h-[calc(100vh-15rem)] min-h-[520px] overflow-hidden lg:grid-cols-[250px_1fr]">
      <aside className="hidden overflow-y-auto border-e p-4 lg:block"><p className="px-2 text-xs font-bold text-slate-400">{t("chat.conversations")}</p><div className="mt-3 space-y-1">{conversations.map(chat => <button key={chat.id} onClick={() => setActive(chat.id)} dir="auto" className={`w-full truncate rounded-lg px-3 py-2 text-start text-sm ${active === chat.id ? "bg-teal-50 font-semibold text-teal-800" : "hover:bg-slate-50"}`}>{title(chat)}</button>)}</div></aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        {conversations.length > 0 && <div className="border-b p-3 lg:hidden"><select className="field py-2" value={active ?? ""} onChange={event => setActive(event.target.value)} aria-label={t("chat.conversations")}>{conversations.map(chat => <option key={chat.id} value={chat.id}>{title(chat)}</option>)}</select></div>}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {messages.length ? messages.map(message => message.role === "user" ? <article key={message.id} className="bubble-user ms-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7" dir="auto">{message.content}</article> : <AssistantMessage key={message.id} message={message} />) :
            <div className="grid h-full place-items-center text-center"><div className="max-w-lg"><p className="text-lg font-bold">{t("chat.emptyTitle")}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t("chat.emptyHint")}</p><p className="mt-6 text-xs font-bold text-slate-400">{t("chat.suggestions")}</p><div className="mt-2 flex flex-wrap justify-center gap-2">{suggestions.map(key => <button key={key} type="button" onClick={() => void ask(t(key))} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">{t(key)}</button>)}</div></div></div>}
          {sending && <div className="flex items-center gap-2 text-sm text-slate-400"><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--chart)" }} />{t("chat.thinking")}</div>}
          <div ref={bottom} />
        </div>
        <form className="border-t p-4" onSubmit={submit}><div className="flex items-end gap-3"><textarea className="field max-h-40 min-h-12 resize-none" rows={1} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={onKey} placeholder={t("chat.placeholder")} maxLength={4000} dir="auto" /><button className="btn" disabled={sending || !question.trim()}>{t("chat.send")}</button></div></form>
      </div>
    </section>
  </AppShell>;
}
