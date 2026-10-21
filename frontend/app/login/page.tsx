"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorMessage, saveTokens } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { const result = await api<{ access: string; refresh: string }>("/auth/login/", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) }); saveTokens(result.access, result.refresh); router.push("/dashboard"); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-ink p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><p className="text-sm font-bold text-teal-600">خوش برگشتید</p><h1 className="mt-2 text-3xl font-black leading-snug">اسناد شما، فهمیده‌شده.</h1><p className="mt-2 text-slate-500">برای جست‌وجو و گفت‌وگو با پایگاه دانش خصوصی‌تان وارد شوید.</p><form className="mt-8 space-y-4" onSubmit={submit}><input className="field" name="username" placeholder="نام کاربری" required autoComplete="username" dir="auto" /><input className="field" name="password" type="password" placeholder="رمز عبور" required autoComplete="current-password" />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy ? "در حال ورود…" : "ورود"}</button></form><p className="mt-6 text-center text-sm text-slate-500">حساب ندارید؟ <Link className="font-bold text-teal-600" href="/register">ثبت‌نام کنید</Link></p></section></main>;
}
