"use server";

import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";
import { moderationPattern, type ReactionType } from "./types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function storyClient() {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: user.email?.split("@")[0] ?? "teman" }, { onConflict: "id", ignoreDuplicates: true });
  return { supabase, user, error };
}

export async function publishStory(body: string) {
  if (typeof body !== "string" || !body.trim() || body.trim().length > 5000) return { error: "Tulis ceritamu, maksimal 5.000 karakter, ya." };
  const { supabase, user, error: profileError } = await storyClient();
  if (profileError) return { error: "Profil belum siap. Coba lagi sebentar, ya." };
  const { error } = await supabase.from("stories").insert({ author_id: user.id, body: body.trim() });
  if (error) return { error: "Cerita belum terkirim. Maksimal 5 cerita per jam; coba lagi sebentar, ya." };
  revalidatePath("/app/cerita");
  return { error: null, moderated: moderationPattern.test(body) };
}

export async function reactToStory(id: string, type: ReactionType, selected: boolean) {
  if (typeof id !== "string" || !uuid.test(id) || !["peluk", "semangat", "aku_juga"].includes(type) || typeof selected !== "boolean") return { error: "Reaksi tidak valid." };
  const { supabase, user, error: profileError } = await storyClient();
  if (profileError) return { error: "Reaksi belum bisa disimpan. Coba lagi sebentar, ya." };
  const query = selected
    ? supabase.from("story_reactions").upsert({ story_id: id, user_id: user.id, type }, { onConflict: "story_id,user_id,type", ignoreDuplicates: true })
    : supabase.from("story_reactions").delete().eq("story_id", id).eq("user_id", user.id).eq("type", type);
  const { error } = await query;
  if (error) return { error: "Reaksi belum tersimpan. Cerita mungkin sudah tidak tersedia." };
  revalidatePath("/app/cerita");
  return { error: null };
}

export async function commentOnStory(id: string, body: string) {
  if (typeof id !== "string" || !uuid.test(id) || typeof body !== "string" || !body.trim() || body.trim().length > 1000) return { error: "Tulis komentar suportif, maksimal 1.000 karakter, ya." };
  const { supabase, user, error: profileError } = await storyClient();
  if (profileError) return { error: "Profil belum siap. Coba lagi sebentar, ya." };
  const { error } = await supabase.from("story_comments").insert({ story_id: id, author_id: user.id, body: body.trim() });
  if (error) return { error: "Komentar belum terkirim. Maksimal 5 komentar per menit; cerita juga harus masih tayang." };
  revalidatePath("/app/cerita");
  return { error: null, moderated: moderationPattern.test(body) };
}

export async function reportContent(type: "story" | "comment", id: string, reason: string, detail: string) {
  if (!["story", "comment"].includes(type) || typeof id !== "string" || !uuid.test(id) || !["spam", "sara", "kekerasan", "lainnya"].includes(reason) || typeof detail !== "string" || detail.trim().length > 1000) return { error: "Pilih alasan laporan dan isi detail maksimal 1.000 karakter." };
  const { supabase, user, error: profileError } = await storyClient();
  if (profileError) return { error: "Laporan belum bisa dikirim. Coba lagi sebentar, ya." };
  const { error } = await supabase.from("reports").insert({ target_type: type, target_id: id, reporter_id: user.id, reason, detail: detail.trim() });
  if (error?.code === "23505") return { error: "Kamu sudah melaporkan konten ini. Terima kasih sudah menjaga ruang ini." };
  if (error) return { error: "Laporan belum terkirim. Maksimal 5 laporan per menit; coba lagi sebentar, ya." };
  return { error: null };
}
