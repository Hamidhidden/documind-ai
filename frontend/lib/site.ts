/** Public business details, set per deployment (see .env.production.example). */
export const site = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  name: "داکیومایند",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? "",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  salesEmail: process.env.NEXT_PUBLIC_SALES_EMAIL ?? process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  enamadId: process.env.NEXT_PUBLIC_ENAMAD_ID ?? "",
  enamadCode: process.env.NEXT_PUBLIC_ENAMAD_CODE ?? "",
  // The legal pages are drafts until a lawyer reviews them; set this to "true" afterwards.
  legalReviewed: process.env.NEXT_PUBLIC_LEGAL_REVIEWED === "true",
};

export const description = "دستیار هوشمند و خصوصی اسناد سازمانی: رادار قراردادها برای مهلت‌ها و بندهای پرریسک، گفت‌وگو با اسناد با ذکر منبع، و نصب روی سرور خود سازمان.";
