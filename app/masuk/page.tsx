"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

function friendlyError(error: { code?: string; message?: string; status?: number }) {
  const code = error.code ?? "";
  const text = error.message?.toLowerCase() ?? "";
  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return "Email atau password belum cocok. Coba periksa lagi, ya.";
  if (["user_already_exists", "email_exists"].includes(code) || text.includes("already registered")) return "Email ini sudah terdaftar. Coba tab Masuk atau atur ulang password.";
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "Emailmu belum diverifikasi. Buka email verifikasi dulu, ya.";
  if (code === "weak_password" || text.includes("password should")) return "Gunakan password yang lebih kuat, minimal 8 karakter.";
  if (["email_address_invalid", "validation_failed"].includes(code) || text.includes("invalid email")) return "Alamat email belum valid. Periksa penulisannya, ya.";
  if (error.status === 429 || code.includes("rate_limit")) return "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi, ya.";
  if (code === "signup_disabled") return "Pendaftaran sedang belum tersedia. Coba lagi nanti, ya.";
  if (code === "email_provider_disabled") return "Login email sedang belum tersedia. Coba lagi nanti, ya.";
  return "Belum berhasil terhubung. Periksa koneksi dan coba lagi sebentar, ya.";
}

export default function Masuk() {
  const router = useRouter();
  const [tab, setTab] = useState<"masuk" | "daftar">("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "callback") {
      setIsError(true);
      setMessage("Tautan verifikasi atau reset sudah tidak valid. Coba masuk atau minta tautan baru, ya.");
    }
  }, []);
  function selectTab(next: "masuk" | "daftar") {
    setTab(next); setMessage(""); setPassword(""); setConfirmation(""); setShowPassword(false); setShowConfirmation(false); setIsError(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage("Masukkan alamat email yang valid, ya."); setIsError(true); return; }
    if (tab === "daftar" && password.length < 8) { setMessage("Password minimal 8 karakter, ya."); setIsError(true); return; }
    if (tab === "daftar" && password !== confirmation) { setMessage("Konfirmasi password belum sama. Periksa sekali lagi, ya."); setIsError(true); return; }
    setBusy(true); setMessage(""); setIsError(false);
    try {
      const auth = supabaseBrowser().auth;
      if (tab === "daftar") {
        const { data, error } = await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` } });
        if (error) { setMessage(friendlyError(error)); setIsError(true); }
        else if (data.session) { router.push("/app"); router.refresh(); }
        else { setMessage("Cek email untuk verifikasi."); setPassword(""); setConfirmation(""); }
      } else {
        const { error } = await auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setMessage(friendlyError(error)); setIsError(true); }
        else { router.push("/app"); router.refresh(); }
      }
    } catch { setMessage("Belum bisa terhubung. Periksa koneksi lalu coba lagi, ya."); setIsError(true); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage("Isi emailmu terlebih dahulu untuk menerima tautan reset password."); setIsError(true); return; }
    setBusy(true); setMessage(""); setIsError(false);
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/app/profil` });
      setIsError(Boolean(error));
      setMessage(error ? friendlyError(error) : "Jika emailmu terdaftar, tautan reset password akan dikirim. Cek kotak masuk dan folder spam, ya.");
    } catch { setMessage("Tautan belum bisa dikirim. Coba lagi sebentar, ya."); setIsError(true); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen px-5 py-8"><section className="w-full max-w-md rounded-[36px] bg-white/95 p-6 shadow-soft sm:p-9">
    <Link href="/" className="mx-auto mb-6 flex w-fit flex-col items-center gap-2 text-lg font-semibold text-purple-800"><Image src="/logo-mark.png" alt="Logo CeritaKita" width={64} height={64} priority />CeritaKita</Link>
    <h1 className="text-center text-2xl font-medium tracking-tight">{tab === "masuk" ? "Selamat datang kembali" : "Mulai perjalananmu"}</h1><p className="mt-3 text-center text-sm leading-relaxed text-muted">{tab === "masuk" ? "Ada ruang untuk ceritamu di sini." : "Buat akun dan temukan ruang tenangmu."}</p>
    <div role="tablist" aria-label="Masuk atau daftar" className="mt-7 grid grid-cols-2 gap-2 rounded-full bg-lilac/60 p-1">{(["masuk", "daftar"] as const).map(value => <button key={value} type="button" role="tab" id={`tab-${value}`} aria-selected={tab === value} aria-controls="auth-panel" tabIndex={tab === value ? 0 : -1} disabled={busy} onClick={() => selectTab(value)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
      event.preventDefault();
      const next = event.key === "Home" ? "masuk" : event.key === "End" ? "daftar" : value === "masuk" ? "daftar" : "masuk";
      selectTab(next); document.getElementById(`tab-${next}`)?.focus();
    }} className={`min-h-11 rounded-full text-sm transition-colors duration-200 focus-visible:outline-purple-600 ${tab === value ? "bg-white font-semibold text-purple-800 shadow-sm" : "text-muted"}`}>{value === "masuk" ? "Masuk" : "Daftar"}</button>)}</div>
    <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}><form onSubmit={submit} aria-busy={busy} className="mt-6"><fieldset disabled={busy} className="space-y-5">
      <div><label htmlFor="auth-email" className="text-sm font-medium">Email</label><input id="auth-email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@email.com" className="auth-input mt-2" /></div>
      <div><label htmlFor="auth-password" className="text-sm font-medium">Password</label><div className="relative mt-2"><input id="auth-password" type={showPassword ? "text" : "password"} required minLength={tab === "daftar" ? 8 : undefined} autoComplete={tab === "daftar" ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={tab === "daftar" ? "password-hint" : undefined} className="auth-input !pr-24" /><button type="button" aria-controls="auth-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-2 rounded-full px-3 text-xs text-purple-800 focus-visible:outline-purple-600">{showPassword ? "Sembunyikan" : "Tampilkan"}</button></div>{tab === "daftar" && <p id="password-hint" className="mt-2 text-xs text-muted">Minimal 8 karakter.</p>}</div>
      {tab === "daftar" && <div><label htmlFor="auth-confirm" className="text-sm font-medium">Konfirmasi password</label><div className="relative mt-2"><input id="auth-confirm" type={showConfirmation ? "text" : "password"} required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="auth-input !pr-24" /><button type="button" aria-controls="auth-confirm" aria-pressed={showConfirmation} onClick={() => setShowConfirmation(!showConfirmation)} className="absolute inset-y-0 right-2 rounded-full px-3 text-xs text-purple-800 focus-visible:outline-purple-600">{showConfirmation ? "Sembunyikan" : "Tampilkan"}</button></div></div>}
      {tab === "masuk" && <button type="button" onClick={resetPassword} className="block min-h-11 text-sm text-purple-800 underline underline-offset-4">Lupa password?</button>}
      <button type="submit" className="btn btn-brand w-full justify-center text-sm disabled:opacity-60">{busy ? "Memproses…" : tab === "masuk" ? "Masuk →" : "Daftar →"}</button>
    </fieldset></form></div>
    <p role={isError ? "alert" : "status"} className="mt-5 min-h-6 text-center text-sm leading-relaxed text-purple-800">{message}</p>
  </section></main>;
}
