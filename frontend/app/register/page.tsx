"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, errorMessage } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); try { await api("/auth/register/", { method: "POST", body: JSON.stringify({ username: form.get("username"), email: form.get("email"), password: form.get("password"), password_confirm: form.get("passwordConfirm") }) }); router.push("/login"); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }
  return <main className="grid min-h-screen place-items-center bg-teal-50 p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"><p className="text-sm font-bold text-teal-600">START ORGANIZING</p><h1 className="mt-2 text-3xl font-black">Create your workspace.</h1><form className="mt-8 space-y-4" onSubmit={submit}><input className="field" name="username" placeholder="Username" required /><input className="field" name="email" type="email" placeholder="Email" required /><input className="field" name="password" type="password" placeholder="Password" required minLength={8} /><input className="field" name="passwordConfirm" type="password" placeholder="Confirm password" required minLength={8} />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="btn w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button></form><p className="mt-6 text-center text-sm text-slate-500">Already a member? <Link className="font-bold text-teal-600" href="/login">Sign in</Link></p></section></main>;
}

