"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { messages, type Locale, type MessageKey } from "./messages";

export type Theme = "light" | "dark";
type Preferences = {
  locale: Locale; theme: Theme; setLocale: (locale: Locale) => void; setTheme: (theme: Theme) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  number: (value: number, digits?: number) => string;
  percent: (ratio: number) => string;
  date: (value: string | Date, style?: "short" | "long" | "day") => string;
  bytes: (value: number) => string;
};

const PreferencesContext = createContext<Preferences | null>(null);

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try { const value = localStorage.getItem(key) as T | null; return value && allowed.includes(value) ? value : fallback; } catch { return fallback; }
}
function persist(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { /* private mode: keep in memory only */ } }

export function applyPreferences(locale: Locale, theme: Theme): void {
  const root = document.documentElement;
  root.lang = locale; root.dir = locale === "fa" ? "rtl" : "ltr";
  root.classList.toggle("dark", theme === "dark");
}

/** Runs before hydration (see layout) so the page never flashes the wrong theme or direction. */
export const preferencesBootScript = `(function(){try{var l=localStorage.getItem("locale")||"fa",t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),r=document.documentElement;r.lang=l;r.dir=l==="en"?"ltr":"rtl";if(t==="dark")r.classList.add("dark")}catch(e){}})()`;

export function PreferencesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>("fa");
  const [theme, setThemeState] = useState<Theme>("light");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setLocaleState(stored("locale", ["fa", "en"] as const, "fa"));
    setThemeState(stored("theme", ["light", "dark"] as const, systemDark ? "dark" : "light"));
    setLoaded(true);
  }, []);
  // The boot script already applied the saved choice; applying the defaults before they are
  // loaded would flash the wrong theme and direction.
  useEffect(() => { if (loaded) applyPreferences(locale, theme); }, [loaded, locale, theme]);
  const setLocale = useCallback((value: Locale) => { persist("locale", value); setLocaleState(value); }, []);
  const setTheme = useCallback((value: Theme) => { persist("theme", value); setThemeState(value); }, []);

  const value = useMemo<Preferences>(() => {
    const tag = locale === "fa" ? "fa-IR" : "en-US";
    const dateTag = locale === "fa" ? "fa-IR-u-ca-persian" : "en-US";
    const t = (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = messages[locale][key] ?? messages.en[key] ?? key;
      for (const [name, replacement] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, String(replacement));
      return text;
    };
    const number = (input: number, digits = 0) => new Intl.NumberFormat(tag, { maximumFractionDigits: digits }).format(input);
    const percent = (ratio: number) => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 }).format(ratio);
    const date = (input: string | Date, style: "short" | "long" | "day" = "short") => {
      const options: Intl.DateTimeFormatOptions = style === "long" ? { dateStyle: "full" } : style === "day" ? { month: "short", day: "numeric" } : { dateStyle: "medium" };
      return new Intl.DateTimeFormat(dateTag, options).format(typeof input === "string" ? new Date(input) : input);
    };
    const bytes = (input: number) => {
      if (input < 1024 * 1024) return t("units.kb", { value: number(Math.max(1, Math.round(input / 1024))) });
      if (input < 1024 ** 3) return t("units.mb", { value: number(input / 1024 / 1024, 1) });
      return t("units.gb", { value: number(input / 1024 ** 3, 2) });
    };
    return { locale, theme, setLocale, setTheme, t, number, percent, date, bytes };
  }, [locale, theme, setLocale, setTheme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}

function SunIcon() {
  return <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function MoonIcon() {
  return <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
}

export function PreferenceSwitches({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();
  const base = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50";
  return <div className="flex items-center gap-2">
    <button type="button" className={base} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t("prefs.theme")} title={t("prefs.theme")}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}{!compact && <span>{theme === "dark" ? t("prefs.light") : t("prefs.dark")}</span>}
    </button>
    <button type="button" className={base} onClick={() => setLocale(locale === "fa" ? "en" : "fa")} aria-label={t("prefs.language")} title={t("prefs.language")}>
      {locale === "fa" ? "English" : "فارسی"}
    </button>
  </div>;
}
