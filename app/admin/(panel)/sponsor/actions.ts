"use server";
import {requireAdmin} from "@/lib/admin";
import {revalidatePath} from "next/cache";
import {validateSponsor,type Sponsor} from "@/lib/sponsors-schema";
export async function saveSponsor(value:Sponsor){const {supabase}=await requireAdmin();try{const invalid=validateSponsor(value);if(invalid)return {error:invalid};if(typeof value.id!=='string'||(value.id&&!/^[0-9a-f-]{36}$/i.test(value.id)))return {error:'Sponsor tidak valid.'};const {error}=await supabase.rpc('admin_save_marketing',{kind:'sponsor',payload:value});if(error)return {error:'Sponsor belum tersimpan. Periksa migration dan pilih gambar dari library.'};revalidatePath('/','layout');return {error:null};}catch{return {error:'Data sponsor tidak valid.'};}}
export async function deleteSponsor(id:string){const {supabase}=await requireAdmin();if(!/^[0-9a-f-]{36}$/i.test(id))return {error:'Sponsor tidak valid.'};const {error}=await supabase.rpc('admin_save_marketing',{kind:'sponsor_delete',payload:{id}});if(error)return {error:'Sponsor belum terhapus.'};revalidatePath('/','layout');return {error:null};}
