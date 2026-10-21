"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorMessage, saveTokens } from "../../lib/api";
import { PreferenceSwitches, usePreferences } from "../../lib/preferences";

export default function LoginPage() {
  const router = useRouter(); const { t } = usePreferences(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const result = await api<{ access: string; refresh: string }>("/auth/login/", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) }); saveTokens(result.access, result.refresh); router.push("/dashboard"); }
    catch (cause) { setError(errorMessage(cause, t("common.error"))); } finally { setBusy(false); }
  }
  return <main className="relative grid min-h-screen place-items-center bg-ink p-5"><div className="absolute end-5 top-5"><PreferenceSwitches /></div><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><p className="text-sm font-bold text-teal-600">{t("login.eyebrow")}</p><h1 className="mt-2 text-3xl font-black leading-snug">{t("login.title")}</h1><p className="mt-2 text-slate-500">{t("login.subtitle")}</p><form className="mt-8 space-y-4" onSubmit={submit}><input className="field" name="username" placeholder={t("login.username")} required autoComplete="username" dir="auto" /><input className="field" name="password" type="password" placeholder={t("login.password")} required autoComplete="current-password" />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy ? t("login.busy") : t("login.submit")}</button></form><p className="mt-6 text-center text-sm text-slate-500">{t("login.noAccount")} <Link className="font-bold text-teal-600" href="/register">{t("login.register")}</Link></p></section></main>;
}
