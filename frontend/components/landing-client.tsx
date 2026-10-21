"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isAuthenticated, PlanInfo } from "../lib/api";
import { site } from "../lib/site";

export function AuthButtons() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(isAuthenticated()), []);
  return signedIn ? <Link href="/dashboard" className="btn py-2">ورود به داشبورد</Link> : <div className="flex items-center gap-2"><Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-slate-600 sm:block">ورود</Link><Link href="/register" className="btn py-2">شروع رایگان</Link></div>;
}

const persian = new Intl.NumberFormat("fa-IR");
const names: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", enterprise: "سازمانی / هلدینگ" };
const taglines: Record<string, string> = { free: "برای آشنایی با امکانات اصلی", pro: "برای تیم‌هایی که با قرارداد و آیین‌نامه کار می‌کنند", enterprise: "نصب روی سرور سازمان، برای هلدینگ‌ها" };

function features(plan: PlanInfo): string[] {
  const { limits } = plan;
  const lines = [
    limits.documents == null ? "اسناد و فضای ذخیره‌سازی نامحدود" : `${persian.format(limits.documents)} سند`,
    limits.monthly_questions == null ? "پرسش نامحدود" : `${persian.format(limits.monthly_questions)} پرسش در ماه`,
    limits.seats == null ? "کاربران نامحدود" : `${persian.format(limits.seats)} کاربر`,
    "گفت‌وگوی مستند و جست‌وجوی معنایی",
  ];
  if (plan.features.includes("contract_radar")) lines.push("رادار قراردادها: مهلت‌ها و بندهای پرریسک");
  if (plan.features.includes("advanced_summaries")) lines.push("خلاصه مدیریتی و نکات کلیدی");
  if (plan.features.includes("knowledge_gaps")) lines.push("گزارش خلأهای دانشی");
  if (plan.code === "enterprise") lines.push("داده‌ها از سازمان خارج نمی‌شوند", "پشتیبانی ویژه و آموزش تیم");
  return lines;
}

export function Pricing() {
  const [plans, setPlans] = useState<PlanInfo[] | null>(null); const [trialDays, setTrialDays] = useState(14); const [yearly, setYearly] = useState(true);
  useEffect(() => { api<{ plans: PlanInfo[]; trial_days: number }>("/billing/plans/").then(data => { setPlans(data.plans); setTrialDays(data.trial_days); }).catch(() => setPlans([])); }, []);
  if (plans === null) return <p className="mt-10 text-center text-slate-400">در حال بارگذاری قیمت‌ها…</p>;
  return <>
    <div className="mt-8 flex justify-center"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm">{[false, true].map(value => <button key={String(value)} onClick={() => setYearly(value)} className={`rounded-lg px-4 py-1.5 font-semibold ${yearly === value ? "bg-teal-50 text-teal-700" : "text-slate-500"}`}>{value ? <>سالانه <span className="ms-1 rounded-full bg-emerald-100 px-1.5 text-[11px] text-emerald-700">۲ ماه رایگان</span></> : "ماهانه"}</button>)}</div></div>
    <div className="mt-8 grid gap-5 lg:grid-cols-3">{plans.map(plan => {
      const price = yearly ? plan.prices.yearly : plan.prices.monthly; const featured = plan.code === "pro";
      return <article key={plan.code} className={`card flex flex-col p-7 ${featured ? "ring-2 ring-teal-500" : ""}`}>
        {featured && <span className="mb-3 self-start rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">پیشنهاد ما</span>}
        <h3 className="text-xl font-black">{names[plan.code]}</h3><p className="mt-1 text-sm text-slate-500">{taglines[plan.code]}</p>
        <p className="mt-5 min-h-[3.5rem]">{plan.code === "free" ? <span className="text-3xl font-black">رایگان</span> : price ? <><span className="whitespace-nowrap text-2xl font-black">{persian.format(price)} تومان</span><span className="block text-xs text-slate-400">{yearly ? "در سال" : "در ماه"}</span></> : <span className="text-lg font-bold">قیمت اختصاصی</span>}</p>
        <ul className="mt-5 flex-1 space-y-2 text-sm">{features(plan).map(line => <li key={line} className="flex gap-2"><span className="text-teal-600">✓</span>{line}</li>)}</ul>
        {plan.code === "enterprise" ? (site.salesEmail ? <a className="btn-secondary mt-6" href={`mailto:${site.salesEmail}`}>درخواست جلسه معرفی</a> : <Link className="btn-secondary mt-6" href="/contact">تماس با فروش</Link>)
          : <Link className={`${featured ? "btn" : "btn-secondary"} mt-6`} href="/register">{featured ? `${persian.format(trialDays)} روز رایگان امتحان کنید` : "ساخت حساب رایگان"}</Link>}
      </article>;
    })}</div>
  </>;
}
