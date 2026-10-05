import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicReview } from "@/app/app/review/types";

export function publicReviewClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try { return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); } catch { return null; }
}
export async function readReviews(client: SupabaseClient | null) {
  if (!client) return {reviews: [] as PublicReview[], error:true};
  const {data,error}=await client.from("review_feed").select("id,name,rating,title,body,helpful_count,voted,day");
  const reviews: PublicReview[]=(data??[]).map(row=>({id:row.id,name:row.name,rating:Number(row.rating),title:row.title,body:row.body,helpful:Number(row.helpful_count),voted:Boolean(row.voted),day:row.day}));
  return {reviews,error:Boolean(error)};
}

export async function readLandingReviews() {
  const client=publicReviewClient();
  if (!client) return [];
  const {data,error}=await client.from("review_feed").select("id,name,rating,title,body").eq("is_featured",true).limit(12);
  if(error)return [];
  return (data??[]).map(row=>({name:String(row.name),text:String(row.body??"").slice(0,240),tag:"Ulasan CeritaKita",rating:Number(row.rating)}));
}
