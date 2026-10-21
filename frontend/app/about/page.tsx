import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Placeholder } from "../../components/marketing";
import { site } from "../../lib/site";

export const metadata: Metadata = { title: "درباره ما | داکیومایند", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <LegalPage title="درباره داکیومایند">
    <p>سازمان‌ها هر روز با ده‌ها قرارداد، آیین‌نامه و صورت‌جلسه سروکار دارند و بخش مهمی از دانش و تعهداتشان در همین اسناد پنهان است. یک مهلت از دست‌رفته یا بندی که دیده نشده، می‌تواند هزینه سنگینی بسازد.</p>
    <p>داکیومایند را ساختیم تا این اسناد قابل جست‌وجو و قابل پرسش شوند: قراردادها خوانده می‌شوند، مهلت‌ها و ریسک‌ها پیش از رسیدن یادآوری می‌شوند و کارکنان پاسخ پرسش‌هایشان را با ذکر منبع از اسناد خود سازمان می‌گیرند.</p>
    <p>از روز اول برای زبان فارسی و برای سازمان‌هایی ساخته شده که نمی‌خواهند اسنادشان از سازمان خارج شود؛ به همین دلیل نسخه سازمانی کاملاً روی سرور خود مشتری اجرا می‌شود.</p>
    <p>داکیومایند محصول <Placeholder value={site.company} label="نام کسب‌وکار" /> است. برای آشنایی بیشتر یا درخواست جلسه معرفی، از <Link className="font-semibold text-teal-700" href="/contact">صفحه تماس</Link> با ما در ارتباط باشید.</p>
  </LegalPage>;
}
