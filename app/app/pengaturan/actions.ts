"use server";
import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";
export async function saveName(name: string) {
 if(typeof name!=="string" || !name.trim() || name.trim().length>60) return {error:"Nama panggilan harus berisi 1–60 karakter."};
 const {supabase,user}=await authenticatedClient();
 const {error: insertError}=await supabase.from("profiles").upsert({id:user.id,display_name:name.trim()},{onConflict:"id",ignoreDuplicates:true});
 if(insertError)return {error:"Nama belum bisa disimpan."};
 const {error}=await supabase.from("profiles").update({display_name:name.trim()}).eq("id",user.id);
 revalidatePath("/app","layout"); return {error:error?"Nama belum bisa disimpan.":null};
}
