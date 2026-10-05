"use server";
import {requireAdmin} from "@/lib/admin";
import {revalidatePath} from "next/cache";
import {moderationReason} from "@/lib/moderation-types";
export async function moderateReview(id:string,action:"hidden"|"removed"|"restore"|"feature"|"note",reason:string,note:string,featured:boolean){
 const {supabase}=await requireAdmin();if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||!['hidden','removed','restore','feature','note'].includes(action)||typeof note!=="string"||note.length>1000||typeof featured!=="boolean"||(['hidden','removed'].includes(action)&&!moderationReason(reason,note)))return {error:"Isi alasan moderasi yang valid (3–1.000 karakter)."};
 const {error}=await supabase.rpc("admin_moderate_review",{target_id:id,operation:action,reason,note:note.trim(),featured});if(error)return {error:"Ulasan belum diperbarui. Feature hanya tersedia untuk ulasan yang tayang."};
 revalidatePath("/admin/review");revalidatePath("/app/review");revalidatePath("/review");revalidatePath("/");return {error:null};
}
