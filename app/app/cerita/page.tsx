import type { Metadata } from "next";
import { authenticatedClient } from "@/lib/supabase-server";
import StoryRoom from "@/components/StoryRoom";
import type { CrisisHelp, Story } from "./types";

export const metadata: Metadata = { title: "Ruang cerita anonim" };

export default async function StoriesPage() {
  const { supabase } = await authenticatedClient();
  const [{ data: rows, error }, { data: setting }] = await Promise.all([
    supabase.from("story_feed").select("id,alias,body,day,peluk,semangat,aku_juga,my_peluk,my_semangat,my_aku_juga").limit(30),
    supabase.from("site_settings").select("value").eq("key", "crisis_help").maybeSingle(),
  ]);
  const ids = (rows ?? []).map(row => String(row.id));
  const { data: comments, error: commentError } = ids.length
    ? await supabase.from("story_comment_feed").select("id,story_id,alias,body,day").in("story_id", ids).limit(300)
    : { data: [], error: null };
  const stories: Story[] = (rows ?? []).map(row => ({
    id: row.id, alias: row.alias, body: row.body, day: row.day,
    reactions: { peluk: Number(row.peluk), semangat: Number(row.semangat), aku_juga: Number(row.aku_juga) },
    mine: { peluk: Boolean(row.my_peluk), semangat: Boolean(row.my_semangat), aku_juga: Boolean(row.my_aku_juga) },
    comments: (comments ?? []).filter(comment => comment.story_id === row.id).slice(0, 5).reverse().map(comment => ({ id: comment.id, alias: comment.alias, body: comment.body, day: comment.day })),
  }));
  const value: unknown = setting?.value;
  let help: CrisisHelp | null = null;
  if (value && typeof value === "object" && "label" in value && "url" in value && "phone" in value && "emergency" in value && "source" in value &&
      typeof value.label === "string" && typeof value.url === "string" && /^https:\/\//.test(value.url) && typeof value.phone === "string" && typeof value.emergency === "string" && typeof value.source === "string" && /^https:\/\//.test(value.source)) {
    help = { label: value.label, url: value.url, phone: value.phone, emergency: value.emergency, source: value.source };
  }
  return <><p className="text-xs tracking-[.15em] text-purple-800">KAMU BOLEH BERCERITA</p><h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Ruang cerita anonim</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Bagikan perasaanmu tanpa menampilkan identitas. Nama samaran baru dibuat acak untuk setiap cerita dan komentar. Hindari menulis nama, alamat, atau detail pribadi.</p><StoryRoom stories={stories} help={help} loadError={Boolean(error)} commentError={Boolean(commentError)} /><p className="mt-8 text-xs leading-relaxed text-muted">CeritaKita bukan pengganti tenaga profesional atau layanan darurat.</p></>;
}
