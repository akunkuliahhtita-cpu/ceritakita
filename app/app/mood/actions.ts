"use server";

import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";

export async function saveDailyMood(input: { score: number; emotions: string[]; note: string }) {
  if (!input || !Number.isInteger(input.score) || input.score < 1 || input.score > 5 ||
      !Array.isArray(input.emotions) || input.emotions.length > 5 ||
      input.emotions.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 30) ||
      typeof input.note !== "string" || input.note.trim().length > 500) {
    return { error: "Pilih mood 1–5, maksimal 5 tag, dan catatan maksimal 500 karakter, ya." };
  }
  const { supabase, user } = await authenticatedClient();
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "teman",
  }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { error: "Profil belum siap. Coba simpan mood lagi sebentar, ya." };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const { error } = await supabase.from("mood_entries").upsert({
    user_id: user.id, day, score: input.score,
    emotions: [...new Set(input.emotions.map(tag => tag.trim()))], note: input.note.trim(),
  }, { onConflict: "user_id,day" });
  if (error) return { error: "Mood belum tersimpan. Coba lagi sebentar, ya." };
  revalidatePath("/app/mood");
  revalidatePath("/app");
  return { error: null };
}
