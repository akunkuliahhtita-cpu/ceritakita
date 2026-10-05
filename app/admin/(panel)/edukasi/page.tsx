import {requireAdmin} from "@/lib/admin";
import EducationManager from "@/components/admin/EducationManager";
import type {EducationRecord} from "@/lib/education";
export default async function Page(){
 const {supabase}=await requireAdmin();
 const [articles,videos]=await Promise.all([
 supabase.from("articles").select("id,title,slug,excerpt,content,cover_url,category,is_premium,status,published_at").order("created_at",{ascending:false}),
 supabase.from("videos").select("id,title,youtube_url,youtube_id,description,category,is_premium,status,sort,published_at").order("sort").order("created_at",{ascending:false})]);
 return <><h1 className="text-3xl font-medium">Konten edukasi</h1><p className="mt-2 text-sm text-muted">Kelola video dan bacaan yang menemani perjalanan pengguna.</p><EducationManager articles={(articles.data??[]) as EducationRecord[]} videos={(videos.data??[]) as EducationRecord[]} loadError={Boolean(articles.error||videos.error)}/></>;
}
