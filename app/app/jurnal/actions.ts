"use server";

import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";

export type JournalEntry = { id: string; title: string; content: string; mood_score: number | null; created_at: string };
type JournalInput = { id?: string; title: string; content: string; mood_score: number | null };
type SaveResult = { error: string; entry?: never } | { error: null; entry: JournalEntry };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveJournal(input: JournalInput): Promise<SaveResult> {
  if (!input || typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 120 ||
      typeof input.content !== "string" || !input.content.trim() || input.content.trim().length > 20000 ||
      (input.id !== undefined && (typeof input.id !== "string" || !uuid.test(input.id))) ||
      (input.mood_score !== null && (!Number.isInteger(input.mood_score) || input.mood_score < 1 || input.mood_score > 5))) {
    return { error: "Isi judul dan cerita, ya. Judul maksimal 120 karakter, isi 20.000 karakter, dan mood 1–5 atau kosong." };
  }
  const { supabase, user } = await authenticatedClient();
  const values = { title: input.title.trim(), content: input.content.trim(), mood_score: input.mood_score };
  if (!input.id) {
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: user.email?.split("@")[0] ?? "teman" }, { onConflict: "id", ignoreDuplicates: true });
    if (error) return { error: "Profil belum siap. Coba simpan jurnal lagi sebentar, ya." };
  }
  const query = input.id
    ? supabase.from("journal_entries").update(values).eq("id", input.id).eq("user_id", user.id)
    : supabase.from("journal_entries").insert({ ...values, user_id: user.id });
  const { data, error } = await query.select("id,title,content,mood_score,created_at").single();
  if (error || !data) return { error: "Jurnal belum tersimpan. Catatan mungkin sudah dihapus atau tidak bisa diakses." };
  revalidatePath("/app/jurnal");
  const entry: JournalEntry = { id: data.id, title: data.title, content: data.content, mood_score: data.mood_score, created_at: data.created_at };
  return { error: null, entry };
}

export async function deleteJournal(id: string): Promise<{ error: string | null }> {
  if (typeof id !== "string" || !uuid.test(id)) return { error: "Catatan tidak valid." };
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", user.id).select("id").single();
  if (error || !data) return { error: "Jurnal belum dihapus. Catatan mungkin sudah dihapus atau tidak bisa diakses." };
  revalidatePath("/app/jurnal");
  return { error: null };
}
