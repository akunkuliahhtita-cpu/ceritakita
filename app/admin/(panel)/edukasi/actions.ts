"use server";
import {requireAdmin,logAudit} from "@/lib/admin";
import {revalidatePath} from "next/cache";
import {educationInputError,sanitizeEducationHtml,youtubeId,type EducationRecord,type EducationKind} from "@/lib/education";
export async function lookupYoutubeTitle(url:string){
 await requireAdmin(); const id=youtubeId(url);if(!id)return {title:null,error:"Gunakan link YouTube yang valid, ya."};
 try{
 const response=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,{signal:AbortSignal.timeout(5000),redirect:"error",cache:"no-store"});
 if(!response.ok)throw new Error();const data:unknown=await response.json();
 if(!data||typeof data!=="object"||!("title" in data)||typeof data.title!=="string"||!data.title.trim())throw new Error();
 await logAudit("education.video.oembed",id);
 return {title:data.title.slice(0,200),error:null};
 }catch{return {title:null,error:"Judul otomatis belum tersedia. Kamu bisa mengisi judul sendiri."};}
}
function refresh(){revalidatePath("/admin/edukasi");revalidatePath("/app/edukasi");revalidatePath("/app");}
export async function saveEducation(kind:EducationKind,item:EducationRecord){
 const {supabase}=await requireAdmin();if(!["articles","videos"].includes(kind))return {error:"Jenis konten tidak valid."};
 let validation:string|null;try{validation=educationInputError(kind,item);}catch{return {error:"Data konten tidak valid."};}if(validation)return {error:validation};
 const payload=kind==="articles"?{id:item.id||null,title:item.title.trim(),slug:item.slug,excerpt:item.excerpt??"",content:sanitizeEducationHtml(item.content??""),cover_url:item.cover_url||null,category:item.category.trim(),is_premium:item.is_premium,status:item.status,published_at:item.published_at??new Date().toISOString()}:{id:item.id||null,title:item.title.trim(),youtube_url:`https://www.youtube.com/watch?v=${youtubeId(item.youtube_url??"")}`,youtube_id:youtubeId(item.youtube_url??""),description:item.description??"",category:item.category.trim(),is_premium:item.is_premium,status:item.status,sort:item.sort,published_at:item.published_at??new Date().toISOString()};
 // The mutation RPC uses the same record_admin_audit RPC as logAudit, atomically.
 const {error}=await supabase.rpc("admin_save_education",{content_kind:kind,payload});
 if(error)return {error:error.code==="23505"?"Slug atau video ini sudah dipakai. Gunakan yang berbeda, ya.":"Konten belum tersimpan. Periksa data dan pastikan migration sudah diterapkan."};refresh();return {error:null};
}
export async function changeEducationStatus(kind:EducationKind,id:string,status:"draft"|"published"){
 const {supabase}=await requireAdmin();if(!["articles","videos"].includes(kind)||!['draft','published'].includes(status)||! /^[0-9a-f-]{36}$/i.test(id))return {error:"Data konten tidak valid."};
 const {error}=await supabase.rpc("admin_change_education",{content_kind:kind,content_id:id,next_status:status,remove_content:false});if(error)return {error:"Status belum berubah. Coba lagi, ya."};refresh();return {error:null};
}
export async function deleteEducation(kind:EducationKind,id:string){
 const {supabase}=await requireAdmin();if(!["articles","videos"].includes(kind)||! /^[0-9a-f-]{36}$/i.test(id))return {error:"Data konten tidak valid."};
 const {error}=await supabase.rpc("admin_change_education",{content_kind:kind,content_id:id,next_status:"draft",remove_content:true});if(error)return {error:"Konten belum terhapus. Coba lagi, ya."};refresh();return {error:null};
}
