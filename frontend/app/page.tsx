import type { Metadata } from "next";
import Link from "next/link";
import { Pricing } from "../components/landing-client";
import { MarketingShell } from "../components/marketing";
import { description, site } from "../lib/site";

export const metadata: Metadata = {
  title: "داکیومایند | رادار قراردادها و دستیار هوشمند اسناد سازمانی",
  description,
  alternates: { canonical: "/" },
};

const features = [
  ["رادار قراردادها", "تاریخ‌ها، مبالغ، تعهدات و بندهای پرریسک هر قرارداد خودکار استخراج می‌شود و پیش از هر مهلت هشدار می‌گیرید."],
  ["گفت‌وگو با اسناد", "به زبان ساده بپرسید؛ پاسخ فقط از اسناد خودتان می‌آید و منبع هر جمله مشخص است."],
  ["خلاصه مدیریتی", "از هر سند خلاصه کوتاه، مفصل، نکات کلیدی یا خلاصه مدیریتی در چند ثانیه."],
  ["داده‌ها در سازمان شما", "نسخه سازمانی روی سرور خودتان نصب می‌شود؛ مدل هوش مصنوعی هم همان‌جا اجرا می‌شود و به اینترنت نیاز ندارد."],
  ["ساخته‌شده برای فارسی", "حروف عربی و فارسی، ارقام فارسی و تقویم شمسی درست فهمیده می‌شوند؛ رابط کاربری کاملاً راست‌به‌چپ است."],
  ["خلأهای دانشی", "ببینید کارکنان چه می‌پرسند که در اسناد پاسخی ندارد، و مستندات سازمان را کامل کنید."],
] as const;

const faqs = [
  ["اسناد ما کجا نگهداری و پردازش می‌شوند؟", "در نسخه سازمانی، همه‌چیز روی سرور خود سازمان شماست: اسناد، پایگاه داده و مدل هوش مصنوعی. متن اسناد به هیچ سرویس خارجی ارسال نمی‌شود."],
  ["آیا به OpenAI یا اینترنت خارج نیاز دارد؟", "خیر. داکیومایند با مدل‌های متن‌باز روی سرور خودتان کار می‌کند و برای پاسخ‌گویی به اینترنت بین‌الملل نیازی ندارد."],
  ["پاسخ‌ها چقدر قابل اعتمادند؟", "هر پاسخ با منبع از اسناد شما همراه است و اگر پاسخ در اسناد نباشد، صریحاً اعلام می‌شود. با این حال خروجی هوش مصنوعی را برای تصمیم‌های مهم با متن اصلی تطبیق دهید."],
  ["چه نوع فایل‌هایی پشتیبانی می‌شود؟", "PDF دارای متن، Word (DOCX)، فایل متنی و Markdown. پشتیبانی از اسناد اسکن‌شده در حال توسعه است."],
  ["دوره آزمایشی چگونه است؟", "پس از ثبت‌نام، همه امکانات پلن حرفه‌ای برای مدت محدود رایگان در دسترس است. اطلاعات پرداخت لازم نیست."],
  ["برای هلدینگ‌ها چه امکانی دارید؟", "نسخه سازمانی با مجوز برای کل مجموعه، نصب روی سرور سازمان، تعداد کاربر دلخواه و پشتیبانی ویژه ارائه می‌شود. برای جلسه معرفی با ما تماس بگیرید."],
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "SoftwareApplication", name: site.name, applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "fa", description, url: site.url },
    { "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ],
};

function RadarPreview() {
  const rows = [["شروع قرارداد پشتیبانی", "۱ آبان ۱۴۰۵", "۲ روز دیگر", "bg-rose-100 text-rose-700"], ["پرداخت قسط اول", "۱۵ آبان ۱۴۰۵", "۱۶ روز دیگر", "bg-rose-100 text-rose-700"], ["آخرین مهلت اعلام عدم تمدید", "۳۰ شهریور ۱۴۰۶", "۳۳۵ روز دیگر", "bg-emerald-100 text-emerald-700"]];
  return <div className="card p-5 text-sm shadow-xl" aria-label="نمونه رادار قراردادها">
    <div className="flex items-center justify-between"><p className="font-bold">تاریخ‌های پیش رو</p><span className="text-xs text-slate-400">قرارداد پشتیبانی نرم‌افزار</span></div>
    <ul className="mt-3 divide-y">{rows.map(([label, date, left, tone]) => <li key={label} className="flex items-center justify-between gap-3 py-2.5"><div><p className="font-semibold">{label}</p><p className="text-xs text-slate-500">{date}</p></div><span className={`status-chip whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{left}</span></li>)}</ul>
    <div className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700"><p className="text-xs font-bold">بند پرریسک · زیاد</p><p className="mt-1 text-xs leading-6">«در صورت عدم اعلام کتبی تا یک ماه قبل از پایان مدت، قرارداد به‌طور خودکار با افزایش ۲۵ درصد تمدید می‌شود.»</p></div>
  </div>;
}

export default function LandingPage() {
  return <MarketingShell>
    {/* JSON-LD for search engines; the content is static and built here, not user input. */}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
        <div>
          <p className="text-sm font-bold text-teal-600">دستیار هوشمند و خصوصی اسناد سازمانی</p>
          <h1 className="mt-3 text-4xl font-black leading-tight lg:text-5xl">پیش از آنکه یک مهلت قرارداد گران تمام شود، باخبر شوید.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">داکیومایند قراردادها و اسناد سازمان را می‌خواند، مهلت‌ها و بندهای پرریسک را پیدا می‌کند و به پرسش‌های تیم شما با ذکر منبع پاسخ می‌دهد؛ همه روی سرور خود سازمان.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn px-6 py-3 text-base">شروع رایگان</Link><a href="#pricing" className="btn-secondary px-6 py-3 text-base">مشاهده قیمت‌ها</a></div>
          <p className="mt-4 text-sm text-slate-400">بدون نیاز به کارت بانکی · داده‌ها خصوصی می‌مانند</p>
        </div>
        <RadarPreview />
      </section>

      <section id="features" className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-black">هر چیزی که تیم شما در اسناد دنبالش است</h2><p className="mt-3 max-w-2xl text-slate-600">از قراردادها و آیین‌نامه‌ها تا صورت‌جلسه‌ها؛ یک‌جا، قابل جست‌وجو و قابل پرسش.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map(([title, text]) => <article key={title} className="card p-6"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></article>)}</div>
        </div>
      </section>

      <section id="radar" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-black">رادار قراردادها چگونه کار می‌کند؟</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">{[["قرارداد را بارگذاری کنید", "PDF یا Word؛ یک فایل یا ده‌ها فایل."], ["هوش مصنوعی آن را می‌خواند", "طرفین، مبالغ، تعهدات، تاریخ‌ها و بندهای پرریسک استخراج می‌شود. تاریخ‌های شمسی دقیق محاسبه می‌شوند."], ["پیش از هر مهلت باخبر شوید", "شمارش معکوس سررسیدها، مهلت‌های اعلام عدم تمدید و فهرست بندهایی که باید بازبینی شوند."]].map(([title, text], index) => <li key={title} className="card p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 font-black text-teal-700">{["۱", "۲", "۳"][index]}</span><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></li>)}</ol>
      </section>

      <section id="pricing" className="border-y border-slate-200 bg-slate-50 py-16"><div className="mx-auto max-w-6xl px-5"><h2 className="text-center text-3xl font-black">قیمت‌گذاری ساده و شفاف</h2><p className="mt-3 text-center text-slate-600">با دوره آزمایشی رایگان شروع کنید و هر وقت تیمتان آماده بود ارتقا دهید.</p><Pricing /></div></section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-16"><h2 className="text-3xl font-black">پرسش‌های رایج</h2>
        <div className="mt-8 divide-y rounded-2xl border border-slate-200">{faqs.map(([question, answer]) => <details key={question} className="group p-5"><summary className="cursor-pointer list-none font-semibold">{question}</summary><p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p></details>)}</div>
      </section>

      <section className="bg-ink py-16 text-center text-white"><div className="mx-auto max-w-2xl px-5"><h2 className="text-3xl font-black">اولین قرارداد را همین امروز بررسی کنید</h2><p className="mt-3 text-slate-300">ثبت‌نام کمتر از یک دقیقه طول می‌کشد.</p><Link href="/register" className="mt-8 inline-flex rounded-xl bg-teal-500 px-6 py-3 font-bold text-white hover:bg-teal-400">شروع رایگان</Link></div></section>
    </main>
  </MarketingShell>;
}
