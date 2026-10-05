"use server";
import {requireAdmin,logAudit} from "@/lib/admin";
import {normalizeBlocks,validateCms,type PageBlock} from "@/lib/cms";
import {revalidatePath} from "next/cache";
export async function saveCmsPage(id:string,title:string,slug:string,blocks:PageBlock[],publish:boolean){
 const {supabase}=await requireAdmin();if(typeof id!=="string"||(id&&!/^[0-9a-f-]{36}$/i.test(id))||typeof publish!=="boolean")return {error:"Halaman tidak valid.",id:null};
 let error:string|null;try{error=validateCms(title,slug,blocks);}catch{return {error:"Data blok tidak valid.",id:null};}if(error)return {error,id:null};
 const cleaned=normalizeBlocks(blocks);if(JSON.stringify(cleaned).length>200000)return {error:"Konten terlalu besar setelah sanitasi.",id:null};
 const result=await supabase.rpc("admin_save_page",{page_id:id||null,page_title:title.trim(),page_slug:slug,page_blocks:cleaned,publish_now:publish});
 if(result.error)return {error:result.error.code==="23505"?"Slug sudah dipakai halaman lain.":"Halaman belum tersimpan. Pilih gambar dari library dan pastikan migration diterapkan.",id:null};
 revalidatePath("/admin/pages");if(publish)revalidatePath(slug==="/"?"/":`/${slug}`);return {error:null,id:String(result.data)};
}
export async function recordCmsPreview(slug:string){await requireAdmin();await logAudit("cms.preview",slug);}
