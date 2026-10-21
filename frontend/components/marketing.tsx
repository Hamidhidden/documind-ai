import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "../lib/site";
import { AuthButtons } from "./landing-client";

/** Header and footer of the public pages. Persian-only: that is the market search targets. */
export function MarketingShell({ children }: Readonly<{ children: ReactNode }>) {
  return <div lang="fa" dir="rtl" className="min-h-screen bg-white text-ink">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="text-xl font-black">داکیو<span className="text-teal-500">مایند</span></Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex"><a href="/#features">امکانات</a><a href="/#radar">رادار قراردادها</a><a href="/#pricing">قیمت‌ها</a><a href="/#faq">پرسش‌های رایج</a><Link href="/contact">تماس</Link></nav>
        <AuthButtons />
      </div>
    </header>
    {children}
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-slate-600 md:grid-cols-[2fr_1fr_1fr_auto]">
        <div><p className="text-lg font-black text-ink">داکیو<span className="text-teal-500">مایند</span></p><p className="mt-2 max-w-sm leading-7">دستیار هوشمند و خصوصی اسناد سازمانی، ساخته‌شده برای زبان فارسی.</p>{site.company && <p className="mt-2 text-xs text-slate-400">{site.company}</p>}</div>
        <div className="space-y-2"><p className="font-bold text-ink">محصول</p><a className="block" href="/#features">امکانات</a><a className="block" href="/#pricing">قیمت‌ها</a><Link className="block" href="/register">شروع رایگان</Link></div>
        <div className="space-y-2"><p className="font-bold text-ink">شرکت</p><Link className="block" href="/about">درباره ما</Link><Link className="block" href="/contact">تماس با ما</Link><Link className="block" href="/terms">قوانین و مقررات</Link><Link className="block" href="/privacy">حریم خصوصی</Link></div>
        <EnamadSeal />
      </div>
    </footer>
  </div>;
}

/** The trust seal from the Enamad panel (its `id` and `Code`); hidden until configured. */
export function EnamadSeal() {
  if (!site.enamadId || !site.enamadCode) return null;
  const query = `id=${encodeURIComponent(site.enamadId)}&Code=${encodeURIComponent(site.enamadCode)}`;
  return <a referrerPolicy="origin" target="_blank" rel="noopener" href={`https://trustseal.enamad.ir/?${query}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img referrerPolicy="origin" src={`https://trustseal.enamad.ir/logo.aspx?${query}`} alt="نماد اعتماد الکترونیکی" width={96} height={96} style={{ cursor: "pointer" }} />
  </a>;
}

export function LegalPage({ title, updated, children }: Readonly<{ title: string; updated?: string; children: ReactNode }>) {
  return <MarketingShell><main className="mx-auto max-w-3xl px-5 py-14">
    <h1 className="text-3xl font-black">{title}</h1>
    {updated && <p className="mt-2 text-sm text-slate-400">آخرین به‌روزرسانی: {updated}</p>}
    {!site.legalReviewed && <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">این متن پیش‌نویس است و باید پیش از انتشار عمومی توسط مشاور حقوقی بازبینی و با شرایط واقعی کسب‌وکار تطبیق داده شود.</p>}
    <div className="legal mt-8 space-y-4 leading-8 text-slate-700">{children}</div>
  </main></MarketingShell>;
}

export function Placeholder({ value, label }: Readonly<{ value: string; label: string }>) {
  return value ? <>{value}</> : <span className="text-slate-400">[{label} — تکمیل شود]</span>;
}
