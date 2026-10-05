"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/admin";
import {validateSiteSettings,type SiteSettings} from "@/lib/site-settings-schema";
export async function saveSiteSettings(input:SiteSettings){const {supabase}=await requireAdmin();const invalid=validateSiteSettings(input);if(invalid)return {error:invalid};const {error}=await supabase.rpc("admin_save_site_settings",{settings:{...input,name:input.name.trim(),whatsappNumber:input.whatsappNumber.replace(/\D/g,""),contactEmail:input.contactEmail.trim(),chips:input.chips.map(v=>v.trim())}});if(error)return {error:error.message.includes("library")?"Gambar sudah dihapus. Pilih ulang dari Media Library.":"Pengaturan atau audit belum tersimpan. Coba lagi."};revalidatePath("/","layout");revalidatePath("/admin/pengaturan");return {error:null};}
