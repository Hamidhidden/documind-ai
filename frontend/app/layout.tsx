import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { PreferencesProvider, preferencesBootScript } from "../lib/preferences";

export const metadata: Metadata = { title: "داکیومایند | DocuMind", description: "دستیار هوشمند و خصوصی اسناد سازمانی — Private AI assistant for company documents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: preferencesBootScript }} /></head><body><PreferencesProvider>{children}</PreferencesProvider></body></html>;
}
