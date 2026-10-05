"use server";
import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function client() {
  const {supabase,user}=await authenticatedClient();
  const {error}=await supabase.from("profiles").upsert({id:user.id,display_name:user.email?.split("@")[0]??"teman"},{onConflict:"id",ignoreDuplicates:true});
  return {supabase,user,error};
}
function refresh(){revalidatePath("/app/review");revalidatePath("/review");revalidatePath("/");}
export async function saveReview(input:{rating:number;title:string;body:string}) {
  if(!input || !Number.isInteger(input.rating)||input.rating<1||input.rating>5||typeof input.title!=="string"||!input.title.trim()||input.title.trim().length>120||typeof input.body!=="string"||!input.body.trim()||input.body.trim().length>2000)return {error:"Isi bintang 1–5, judul maksimal 120 karakter, dan review maksimal 2.000 karakter."};
  const {supabase,user,error:profileError}=await client();
  if(profileError)return {error:"Profil belum siap. Coba lagi sebentar, ya."};
  const {data:existing,error:readError}=await supabase.from("reviews").select("id").eq("user_id",user.id).maybeSingle();
  if(readError)return {error:"Review belum bisa dimuat."};
  const values={rating:input.rating,title:input.title.trim(),body:input.body.trim()};
  const query=existing?supabase.from("reviews").update(values).eq("id",existing.id).eq("user_id",user.id):supabase.from("reviews").insert({...values,user_id:user.id});
  const {error}=await query;
  if(error)return {error:"Review belum tersimpan. Muat ulang lalu coba lagi, ya."};
  refresh();return {error:null};
}
export async function removeReview(){
  const {supabase,user}=await authenticatedClient();
  const {error}=await supabase.from("reviews").delete().eq("user_id",user.id);
  if(error)return {error:"Review belum terhapus."};refresh();return {error:null};
}
export async function voteReview(id:string,selected:boolean){
  if(typeof id!=="string"||!uuid.test(id)||typeof selected!=="boolean")return {error:"Vote tidak valid."};
  const {supabase,user,error:profileError}=await client();if(profileError)return {error:"Vote belum bisa disimpan."};
  const query=selected?supabase.from("review_votes").upsert({review_id:id,user_id:user.id},{onConflict:"review_id,user_id",ignoreDuplicates:true}):supabase.from("review_votes").delete().eq("review_id",id).eq("user_id",user.id);
  const {error}=await query;if(error)return {error:"Vote belum tersimpan. Review mungkin sudah tidak tayang."};refresh();return {error:null};
}
export async function reportReview(id:string,reason:string){
  if(typeof id!=="string"||!uuid.test(id)||!["spam","sara","lainnya"].includes(reason))return {error:"Laporan tidak valid."};
  const {supabase,user,error:profileError}=await client();if(profileError)return {error:"Laporan belum bisa dikirim."};
  const {error}=await supabase.from("reports").insert({target_type:"review",target_id:id,reporter_id:user.id,reason});
  if(error)return {error:error.code==="23505"?"Review ini sudah kamu laporkan.":"Laporan belum terkirim. Coba lagi sebentar, ya."};return {error:null};
}
