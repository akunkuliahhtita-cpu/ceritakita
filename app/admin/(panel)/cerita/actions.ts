"use server";
import {requireAdmin,logAudit} from "@/lib/admin";
import {revalidatePath} from "next/cache";
import {targetValid,type ModerationKind} from "@/lib/moderation-types";
export async function moderateStory(kind:ModerationKind,id:string,action:"hidden"|"removed"|"dismiss"|"suspend",note:string){
 const {supabase}=await requireAdmin();if(!targetValid(kind,id)||!['hidden','removed','dismiss','suspend'].includes(action)||typeof note!=="string"||note.trim().length<3||note.length>1000)return {error:"Isi alasan tindakan (3–1.000 karakter)."};
 const {error}=await supabase.rpc("admin_moderate_story",{target_kind:kind,target_id:id,operation:action,note:note.trim()});if(error)return {error:"Tindakan belum tersimpan. Akun admin tidak bisa disuspend."};revalidatePath("/admin/cerita");revalidatePath("/app","layout");return {error:null};
}
export async function revealStoryIdentity(kind:ModerationKind,id:string,reason:string,serious:boolean){
 const {supabase}=await requireAdmin();if(!targetValid(kind,id)||serious!==true||typeof reason!=="string"||reason.trim().length<10||reason.length>1000)return {data:null,error:"Konfirmasi kasus pelanggaran berat dan jelaskan alasannya (10–1.000 karakter)."};
 await logAudit("moderation.identity.request",`${kind}:${id}`,{reason:reason.trim()});
 const {data,error}=await supabase.rpc("admin_reveal_story_identity",{target_kind:kind,target_id:id,justification:reason.trim(),serious_case:serious});if(error)return {data:null,error:"Identitas belum bisa dibuka."};return {data:data as {name:string;email:string},error:null};
}
