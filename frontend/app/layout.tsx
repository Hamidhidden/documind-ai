import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { PreferencesProvider, preferencesBootScript } from "../lib/preferences";
import { description, site } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "داکیومایند | DocuMind", template: "%s" },
  description,
  openGraph: { type: "website", locale: "fa_IR", siteName: "داکیومایند", title: "داکیومایند | رادار قراردادها و دستیار هوشمند اسناد", description },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} /></head><body><PreferencesProvider>{children}</PreferencesProvider></body></html>;
}
