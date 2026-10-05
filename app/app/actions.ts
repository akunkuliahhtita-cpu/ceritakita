"use server";

import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";

export async function checkInMood(score: number) {
  if (!Number.isInteger(score) || score < 1 || score > 5) return { error: "Pilih salah satu mood yang tersedia, ya." };
  const { supabase, user } = await authenticatedClient();
  const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: user.email?.split("@")[0] ?? "teman" }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { error: "Profil belum siap. Coba lagi sebentar, ya." };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const { error } = await supabase.from("mood_entries").upsert({ user_id: user.id, day, score }, { onConflict: "user_id,day" });
  if (!error) { revalidatePath("/app"); revalidatePath("/app/mood"); }
  return error ? { error: "Mood belum tersimpan. Coba lagi sebentar, ya." } : { error: null };
}
