"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import DashboardIcon from "./DashboardIcon";
export default function DashboardLogout({ className = "" }: { className?: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const { error: result } = await supabaseBrowser().auth.signOut();
      if (result) { setError("Belum bisa keluar. Coba lagi, ya."); setBusy(false); return; }
      router.replace("/masuk"); router.refresh();
    } catch { setError("Belum bisa keluar. Coba lagi, ya."); setBusy(false); }
  }
  return <div><button type="button" onClick={logout} disabled={busy} className={`dashboard-logout ${className}`}><DashboardIcon name="logout" />{busy ? "Keluar…" : "Keluar"}</button>{error && <p role="alert" className="mt-2 text-xs">{error}</p>}</div>;
}
