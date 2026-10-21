"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { PreferenceSwitches, usePreferences } from "../../lib/preferences";

export default function ResetPasswordPage() {
  const { t } = usePreferences(); const [link, setLink] = useState<{ uid: string; token: string } | null>(null); const [done, setDone] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const uid = params.get("uid"); const token = params.get("token"); if (uid && token) setLink({ uid, token }); else setError(t("reset.invalid")); }, [t]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!link) return; setError("");
    const form = new FormData(event.currentTarget); const password = String(form.get("password"));
    if (password !== form.get("confirm")) { setError(t("reset.mismatch")); return; }
    setBusy(true);
    try { await api("/auth/password-reset/confirm/", { method: "POST", body: JSON.stringify({ ...link, password }) }); setDone(true); }
    catch (cause) { setError(errorMessage(cause, t("common.error"))); } finally { setBusy(false); }
  }
  return <main className="relative grid min-h-screen place-items-center bg-ink p-5"><div className="absolute end-5 top-5"><PreferenceSwitches /></div><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
    <h1 className="text-2xl font-black">{t("reset.title")}</h1>
    {done ? <><p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">{t("reset.done")}</p><Link className="btn mt-6 w-full" href="/login">{t("login.submit")}</Link></> :
      <form className="mt-6 space-y-4" onSubmit={submit}><input className="field" name="password" type="password" placeholder={t("reset.password")} required minLength={8} autoComplete="new-password" disabled={!link} /><input className="field" name="confirm" type="password" placeholder={t("reset.confirm")} required minLength={8} autoComplete="new-password" disabled={!link} />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy || !link}>{busy ? t("reset.busy") : t("reset.submit")}</button></form>}
    {!done && <p className="mt-6 text-center text-sm"><Link className="font-bold text-teal-600" href="/forgot-password">{t("forgot.title")}</Link></p>}
  </section></main>;
}
