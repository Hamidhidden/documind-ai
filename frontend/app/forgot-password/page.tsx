"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { PreferenceSwitches, usePreferences } from "../../lib/preferences";

export default function ForgotPasswordPage() {
  const { t } = usePreferences(); const [sent, setSent] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { await api("/auth/password-reset/", { method: "POST", body: JSON.stringify({ email: form.get("email") }) }); setSent(true); }
    catch (cause) { setError(errorMessage(cause, t("common.error"))); } finally { setBusy(false); }
  }
  return <main className="relative grid min-h-screen place-items-center bg-ink p-5"><div className="absolute end-5 top-5"><PreferenceSwitches /></div><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
    <h1 className="text-2xl font-black">{t("forgot.title")}</h1><p className="mt-2 text-slate-500">{t("forgot.subtitle")}</p>
    {sent ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">{t("forgot.sent")}</p> : <form className="mt-6 space-y-4" onSubmit={submit}><input className="field" name="email" type="email" placeholder={t("forgot.email")} required autoComplete="email" dir="ltr" />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy ? t("forgot.busy") : t("forgot.submit")}</button></form>}
    <p className="mt-6 text-center text-sm"><Link className="font-bold text-teal-600" href="/login">{t("forgot.back")}</Link></p>
  </section></main>;
}
