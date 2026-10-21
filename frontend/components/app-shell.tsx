"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearTokens, isAuthenticated } from "../lib/api";

const links = [
  ["Overview", "/dashboard"], ["Documents", "/documents"], ["Collections", "/collections"],
  ["AI Chat", "/chat"], ["Settings", "/settings"]
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const path = usePathname(); const router = useRouter(); const [ready, setReady] = useState(false);
  useEffect(() => { if (isAuthenticated()) setReady(true); else router.replace("/login"); }, [router]);
  if (!ready) return <div className="min-h-screen bg-cloud" />;
  return <div className="min-h-screen bg-cloud text-ink">
    <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
      <Link href="/dashboard" className="mb-12 text-2xl font-black tracking-tight">docu<span className="text-teal-500">mind</span></Link>
      <nav className="space-y-1">{links.map(([label, href]) => <Link key={href} href={href} className={`block rounded-xl px-3 py-2 text-sm font-medium ${path.startsWith(href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}>{label}</Link>)}</nav>
      <button onClick={() => { clearTokens(); router.push("/login"); }} className="mt-auto text-left text-sm text-slate-500 hover:text-slate-900">Sign out</button>
    </aside>
    <main className="mx-auto max-w-7xl p-5 lg:ml-64 lg:p-10">{children}</main>
  </div>;
}

