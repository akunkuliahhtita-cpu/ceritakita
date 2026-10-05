import type { Metadata } from "next";
import { authenticatedClient } from "@/lib/supabase-server";
import JournalWorkspace from "@/components/JournalWorkspace";
import type { JournalEntry } from "./actions";

export const metadata: Metadata = { title: "Jurnal privat" };

export default async function JournalPage() {
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("journal_entries").select("id,title,content,mood_score,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const entries: JournalEntry[] = (data ?? []).map(entry => ({ id: entry.id, title: entry.title ?? "Tanpa judul", content: entry.content ?? "", mood_score: entry.mood_score, created_at: entry.created_at }));
  return <><p className="text-xs tracking-[.15em] text-purple-800">RUANG UNTUK DIRIMU</p><h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Jurnal privat</h1><p className="mt-3 text-sm leading-relaxed text-muted">Tuangkan isi kepala, pelan-pelan. Hanya kamu yang bisa membaca catatan ini.</p>{error ? <p role="alert" className="mt-8 rounded-[24px] bg-peach p-6 text-sm">Jurnal belum bisa dimuat. Coba muat ulang halaman, ya.</p> : <JournalWorkspace initialEntries={entries} />}</>;
}
