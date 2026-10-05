import {activeSponsors} from "@/lib/sponsors";
import type { Metadata } from "next";
import { authenticatedClient } from "@/lib/supabase-server";
import EducationLibrary from "@/components/EducationLibrary";
import type { EducationArticle, EducationVideo } from "./types";
import {sanitizeEducationHtml} from "@/lib/education";

export const metadata: Metadata = { title: "Edukasi" };

export default async function EducationPage() {
  const { supabase } = await authenticatedClient();
  const now = new Date().toISOString();
  const [{ data: articles, error: articleError }, { data: videos, error: videoError }, sponsors] = await Promise.all([
    supabase.from("education_articles").select("id,title,excerpt,content,category,cover_url,is_premium,locked,published_at").lte("published_at",now).order("published_at",{ascending:false}),
    supabase.from("education_videos").select("id,title,youtube_id,description,category,is_premium,locked,sort,published_at").lte("published_at",now).order("sort").order("published_at",{ascending:false}),
    activeSponsors("artikel"),
  ]);
  const safeArticles: EducationArticle[] = (articles??[]).map(a=>({id:a.id,title:a.title,excerpt:a.excerpt,content:a.locked?null:sanitizeEducationHtml(a.content??""),category:a.category,coverUrl:a.cover_url,premium:a.is_premium,locked:a.locked}));
  const safeVideos: EducationVideo[] = (videos??[]).map(v=>({id:v.id,title:v.title,youtubeId:!v.locked&&/^[\w-]{11}$/.test(v.youtube_id??"")?v.youtube_id:null,category:v.category,description:v.description,premium:v.is_premium,locked:v.locked}));
  return <><p className="text-xs tracking-[.15em] text-purple-800">BELAJAR MEMAHAMI DIRI</p><h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Edukasi untuk perjalananmu</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Bacaan ringan dan video pilihan. Ambil yang terasa membantu, sesuai ritmemu sendiri.</p><EducationLibrary sponsors={sponsors} articles={safeArticles} videos={safeVideos} articleError={Boolean(articleError)} videoError={Boolean(videoError)} /><p className="mt-8 text-xs leading-relaxed text-muted">Konten edukasi ini bukan pengganti konsultasi dengan tenaga profesional.</p></>;
}
