"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearTokens, isAuthenticated } from "../lib/api";
import type { MessageKey } from "../lib/messages";
import { PreferenceSwitches, usePreferences } from "../lib/preferences";

const links: [MessageKey, string][] = [
  ["nav.dashboard", "/dashboard"], ["nav.documents", "/documents"], ["nav.radar", "/radar"], ["nav.collections", "/collections"],
  ["nav.chat", "/chat"], ["nav.billing", "/billing"], ["nav.settings", "/settings"]
];

export function Brand() {
  const { locale } = usePreferences();
  return locale === "fa" ? <>داکیو<span className="text-teal-500">مایند</span></> : <>docu<span className="text-teal-500">mind</span></>;
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const path = usePathname(); const router = useRouter(); const { t } = usePreferences(); const [ready, setReady] = useState(false);
  useEffect(() => { if (isAuthenticated()) setReady(true); else router.replace("/login"); }, [router]);
  if (!ready) return <div className="min-h-screen bg-cloud" />;
  const signOut = () => { clearTokens(); router.push("/login"); };
  return <div className="min-h-screen bg-cloud text-ink">
    <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-slate-200 bg-white p-6 lg:flex">
      <Link href="/dashboard" className="mb-12 text-2xl font-black tracking-tight"><Brand /></Link>
      <nav className="space-y-1">{links.map(([label, href]) => <Link key={href} href={href} className={`block rounded-xl px-3 py-2 text-sm font-medium ${path.startsWith(href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}>{t(label)}</Link>)}</nav>
      <div className="mt-auto space-y-4"><PreferenceSwitches /><button onClick={signOut} className="text-start text-sm text-slate-500 hover:text-slate-900">{t("nav.signOut")}</button></div>
    </aside>
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 lg:hidden"><Link href="/dashboard" className="text-lg font-black"><Brand /></Link><PreferenceSwitches compact /></header>
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">{links.map(([label, href]) => <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${path.startsWith(href) ? "bg-teal-50 font-semibold text-teal-700" : "text-slate-600"}`}>{t(label)}</Link>)}<button onClick={signOut} className="whitespace-nowrap px-3 py-1.5 text-sm text-slate-500">{t("nav.signOut")}</button></nav>
    <main className="mx-auto max-w-7xl p-5 lg:ms-64 lg:p-10">{children}</main>
  </div>;
}
