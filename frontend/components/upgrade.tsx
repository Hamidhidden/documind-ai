"use client";

import Link from "next/link";
import { usePreferences } from "../lib/preferences";

export function ProBadge() {
  const { t } = usePreferences();
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"><LockIcon />{t("upgrade.badge")}</span>;
}

/** Shown when the server answered 402: the message says what the plan lacks. */
export function UpgradeNotice({ message }: Readonly<{ message: string }>) {
  const { t } = usePreferences();
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><span className="flex items-center gap-2"><LockIcon />{message}</span><Link href="/billing" className="btn whitespace-nowrap py-1.5">{t("upgrade.cta")}</Link></div>;
}

export function LockedCard({ title, text }: Readonly<{ title: string; text: string }>) {
  const { t } = usePreferences();
  return <section className="card relative overflow-hidden p-8 text-center"><div className="mx-auto max-w-xl"><ProBadge /><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-3 leading-7 text-slate-500">{text}</p><Link href="/billing" className="btn mt-6">{t("upgrade.cta")}</Link></div></section>;
}

function LockIcon() {
  return <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
}
