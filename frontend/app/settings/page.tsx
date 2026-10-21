"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { api, errorMessage } from "../../lib/api";
import { PreferenceSwitches, usePreferences } from "../../lib/preferences";

type Profile = { username: string; email: string; first_name: string; last_name: string; date_joined: string };
export default function SettingsPage() {
  const { t } = usePreferences();
  const [profile, setProfile] = useState<Profile | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { api<Profile>("/auth/me/").then(setProfile).catch(cause => setError(errorMessage(cause, t("common.error")))); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const next = await api<Profile>("/auth/me/", { method: "PATCH", body: JSON.stringify({ first_name: form.get("firstName"), last_name: form.get("lastName"), email: form.get("email") }) }); setProfile(next); setSaved(true); setError(""); } catch (cause) { setError(errorMessage(cause, t("common.error"))); } }
  return <AppShell><header><p className="text-sm font-bold text-teal-600">{t("settings.eyebrow")}</p><h1 className="mt-1 text-3xl font-black">{t("settings.title")}</h1></header>
    <section className="card mt-8 max-w-2xl p-6"><h2 className="text-lg font-bold">{t("settings.appearance")}</h2><p className="mt-1 text-sm text-slate-500">{t("settings.appearanceHint")}</p><div className="mt-4"><PreferenceSwitches /></div></section>
    <section className="card mt-6 max-w-2xl p-6"><h2 className="text-lg font-bold">{t("settings.profile")}</h2>{profile ? <form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-medium">{t("settings.username")}<input className="field mt-1 bg-slate-50" value={profile.username} disabled dir="ltr" /></label><label className="block text-sm font-medium">{t("settings.email")}<input className="field mt-1" name="email" type="email" defaultValue={profile.email} required dir="ltr" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">{t("settings.firstName")}<input className="field mt-1" name="firstName" defaultValue={profile.first_name} /></label><label className="block text-sm font-medium">{t("settings.lastName")}<input className="field mt-1" name="lastName" defaultValue={profile.last_name} /></label></div>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{saved && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{t("settings.saved")}</p>}<button className="btn">{t("settings.save")}</button></form> : <p className="mt-5 text-slate-500">{t("settings.loadingProfile")}</p>}</section>
    <section className="card mt-6 max-w-2xl p-6"><h2 className="text-lg font-bold">{t("settings.privacy")}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{t("settings.privacyText")}</p></section></AppShell>;
}
