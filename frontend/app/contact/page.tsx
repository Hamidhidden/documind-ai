import type { Metadata } from "next";
import { EnamadSeal, LegalPage, Placeholder } from "../../components/marketing";
import { site } from "../../lib/site";

export const metadata: Metadata = { title: "تماس با ما | داکیومایند", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const rows: [string, string, string][] = [
    ["نام کسب‌وکار", site.company, "نام کسب‌وکار"],
    ["نشانی", site.address, "نشانی"],
    ["تلفن", site.phone, "شماره تلفن"],
    ["ایمیل", site.email, "ایمیل تماس"],
  ];
  return <LegalPage title="تماس با ما">
    <p>برای پرسش درباره خدمات، درخواست جلسه معرفی نسخه سازمانی یا پشتیبانی با ما در ارتباط باشید.</p>
    <dl className="card mt-6 divide-y p-0">{rows.map(([label, value, placeholder]) => <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]"><dt className="font-semibold text-ink">{label}</dt><dd dir="auto">{label === "ایمیل" && value ? <a className="text-teal-700" href={`mailto:${value}`}>{value}</a> : label === "تلفن" && value ? <a className="text-teal-700" href={`tel:${value}`} dir="ltr">{value}</a> : <Placeholder value={value} label={placeholder} />}</dd></div>)}</dl>
    <div className="pt-4"><EnamadSeal /></div>
  </LegalPage>;
}
