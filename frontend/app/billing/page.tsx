"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { api, Billing, errorMessage, PlanInfo } from "../../lib/api";
import type { MessageKey } from "../../lib/messages";
import { usePreferences } from "../../lib/preferences";

const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "";

function UsageBar({ label, used, limit, display }: Readonly<{ label: string; used: number; limit: number | null; display: (value: number) => string }>) {
  const { t } = usePreferences();
  const ratio = limit ? Math.min(1, used / limit) : 0;
  return <div><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium">{label}</span><span className="text-slate-500 tabular-nums">{limit == null ? `${display(used)} · ${t("billing.unlimited")}` : t("billing.of", { used: display(used), limit: display(limit) })}</span></div>
    <div className="h-2 rounded-full" style={{ background: "var(--chart-muted)" }}><div className="h-full rounded-full" style={{ width: `${limit == null ? 0 : Math.max(ratio * 100, used ? 2 : 0)}%`, background: ratio >= 0.9 ? "#e11d48" : "var(--chart)" }} /></div></div>;
}

function planFeatures(plan: PlanInfo, t: ReturnType<typeof usePreferences>["t"], number: (n: number) => string, bytes: (n: number) => string): string[] {
  const { limits } = plan; const lines: string[] = [];
  if (limits.documents == null) lines.push(t("feature.unlimitedDocuments"));
  else { lines.push(t("feature.documents", { count: number(limits.documents) })); if (limits.storage_mb) lines.push(t("feature.storage", { size: bytes(limits.storage_mb * 1024 * 1024) })); }
  lines.push(limits.monthly_questions == null ? t("feature.questions", { count: t("billing.unlimited") }) : t("feature.questions", { count: number(limits.monthly_questions) }));
  lines.push(limits.seats == null ? t("feature.unlimitedUsers") : limits.seats === 1 ? t("feature.seat") : t("feature.seats", { count: number(limits.seats) }));
  lines.push(t("feature.basics"));
  for (const feature of ["contract_radar", "advanced_summaries", "knowledge_gaps"]) if (plan.features.includes(feature)) lines.push(t(`feature.${feature}` as MessageKey));
  if (plan.code === "enterprise") lines.push(t("feature.onprem"), t("feature.support"));
  return lines;
}

export default function BillingPage() {
  const { t, number, date, bytes } = usePreferences();
  const [billing, setBilling] = useState<Billing | null>(null); const [interval, setInterval] = useState<"monthly" | "yearly">("yearly"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [result, setResult] = useState<string | null>(null);
  const load = () => api<Billing>("/billing/").then(setBilling).catch(cause => setError(errorMessage(cause, t("common.error"))));
  useEffect(() => { setResult(new URLSearchParams(window.location.search).get("payment")); void load(); }, []);
  async function checkout(plan: string) { setBusy(true); setError(""); try { const { payment_url } = await api<{ payment_url: string }>("/billing/checkout/", { method: "POST", body: JSON.stringify({ plan, interval }) }); window.location.href = payment_url; } catch (cause) { setError(errorMessage(cause, t("common.error"))); setBusy(false); } }
  if (!billing) return <AppShell><p className="text-slate-500">{error || t("common.loading")}</p></AppShell>;
  const current = billing.plan; const ends = billing.ends_at ? date(billing.ends_at) : "";
  const sourceText = billing.source === "trial" ? t("billing.source.trial", { date: ends }) : billing.source === "subscription" ? t("billing.source.subscription", { date: ends }) : billing.source === "license" && billing.license ? t("billing.source.license", { customer: billing.license.customer, date: ends }) : t("billing.source.free");
  return <AppShell>
    <header><p className="text-sm font-bold text-teal-600">{t("billing.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("billing.title")}</h1><p className="mt-2 max-w-2xl text-slate-500">{t("billing.subtitle")}</p></header>
    {result === "success" && <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-emerald-700">✓ {t("billing.success")}</p>}
    {result === "failed" && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{t("billing.failed")}</p>}
    {error && <p className="mt-6 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}
    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="card p-6"><p className="text-sm text-slate-500">{t("billing.current")}</p><p className="mt-1 text-2xl font-black">{t(`plan.${current.code}` as MessageKey)}</p><p className="mt-1 text-sm text-slate-500">{sourceText}</p></div>
      <div className="card space-y-4 p-6"><h2 className="font-bold">{t("billing.usage")}</h2>
        <UsageBar label={t("billing.usage.documents")} used={billing.usage.documents} limit={current.limits.documents} display={value => number(value)} />
        <UsageBar label={t("billing.usage.storage")} used={billing.usage.storage_bytes} limit={current.limits.storage_mb == null ? null : current.limits.storage_mb * 1024 * 1024} display={bytes} />
        <UsageBar label={t("billing.usage.questions")} used={billing.usage.questions_this_month} limit={current.limits.monthly_questions} display={value => number(value)} />
      </div>
    </section>
    {billing.license ? <p className="mt-8 rounded-xl bg-teal-50 p-4 text-sm text-teal-700">{t("billing.licenseNote")}</p> : <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">{(["monthly", "yearly"] as const).map(value => <button key={value} onClick={() => setInterval(value)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${interval === value ? "bg-teal-50 text-teal-700" : "text-slate-500"}`}>{t(`billing.${value}`)}{value === "yearly" && <span className="ms-1.5 rounded-full bg-emerald-100 px-1.5 text-[11px] text-emerald-700">{t("billing.yearlySave")}</span>}</button>)}</div>
        {billing.gateway === "dev" && <p className="text-xs text-slate-400">{t("billing.devGateway")}</p>}</div>
      <section className="mt-5 grid gap-5 lg:grid-cols-3">{billing.catalog.map(plan => {
        const price = plan.prices[interval]; const isCurrent = plan.code === current.code && billing.source !== "trial"; const featured = plan.code === "pro";
        return <article key={plan.code} className={`card flex flex-col p-6 ${featured ? "ring-2 ring-teal-500" : ""}`}>
          <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-black">{t(`plan.${plan.code}` as MessageKey)}</h3>{isCurrent && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">{t("billing.currentBadge")}</span>}</div>
          <p className="mt-1 text-sm text-slate-500">{t(`plan.tagline.${plan.code}` as MessageKey)}</p>
          <p className="mt-5 min-h-[3.5rem]">{plan.code === "free" ? <span className="text-3xl font-black">{number(0)}</span> : price ? <><span className="whitespace-nowrap text-2xl font-black tabular-nums">{t("billing.toman", { value: number(price) })}</span><span className="block text-xs text-slate-400">{interval === "monthly" ? t("billing.perMonth") : t("billing.perYear")}</span></> : <span className="text-sm leading-6 text-slate-500">{t("billing.contactHint")}</span>}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">{planFeatures(plan, t, number, bytes).map(line => <li key={line} className="flex gap-2"><span className="text-teal-600">✓</span><span>{line}</span></li>)}</ul>
          {plan.purchasable && price ? <button className={`${featured ? "btn" : "btn-secondary"} mt-6`} disabled={busy} onClick={() => void checkout(plan.code)}>{busy ? t("billing.redirecting") : isCurrent ? t("billing.renew") : t("billing.choose")}</button>
            : plan.code === "enterprise" && SALES_EMAIL ? <a className="btn-secondary mt-6" href={`mailto:${SALES_EMAIL}`}>{t("billing.contact")}</a> : null}
        </article>;
      })}</section></>}
    {billing.payments.length > 0 && <section className="card mt-8 p-6"><h2 className="font-bold">{t("billing.history")}</h2><ul className="mt-3 divide-y text-sm">{billing.payments.map(payment => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span>{t(`plan.${payment.plan}` as MessageKey)} · {t(`billing.${payment.interval}`)} · {date(payment.created_at)}</span><span className="flex items-center gap-3 text-slate-500"><span className="tabular-nums">{t("billing.toman", { value: number(payment.amount_toman) })}</span><span className={payment.status === "paid" ? "text-emerald-700" : payment.status === "failed" ? "text-rose-700" : ""}>{t(`billing.status.${payment.status}`)}</span>{payment.reference_id && <span className="text-xs">{t("billing.ref", { ref: payment.reference_id })}</span>}</span></li>)}</ul></section>}
  </AppShell>;
}
