"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { PreferenceSwitches, usePreferences } from "../../lib/preferences";

export default function RegisterPage() {
  const router = useRouter(); const { t } = usePreferences(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { await api("/auth/register/", { method: "POST", body: JSON.stringify({ username: form.get("username"), email: form.get("email"), password: form.get("password"), password_confirm: form.get("passwordConfirm") }) }); router.push("/login"); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } finally { setBusy(false); } }
  return <main className="relative grid min-h-screen place-items-center bg-teal-50 p-5"><div className="absolute end-5 top-5"><PreferenceSwitches /></div><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"><p className="text-sm font-bold text-teal-600">{t("register.eyebrow")}</p><h1 className="mt-2 text-3xl font-black">{t("register.title")}</h1><form className="mt-8 space-y-4" onSubmit={submit}><input className="field" name="username" placeholder={t("register.username")} required dir="ltr" /><input className="field" name="email" type="email" placeholder={t("register.email")} required dir="ltr" /><input className="field" name="password" type="password" placeholder={t("register.password")} required minLength={8} /><input className="field" name="passwordConfirm" type="password" placeholder={t("register.confirm")} required minLength={8} />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy ? t("register.busy") : t("register.submit")}</button></form><p className="mt-6 text-center text-sm text-slate-500">{t("register.haveAccount")} <Link className="font-bold text-teal-600" href="/login">{t("register.login")}</Link></p></section></main>;
}
