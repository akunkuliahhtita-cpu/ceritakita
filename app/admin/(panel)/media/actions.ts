"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/admin";
import type {MediaItem} from "@/lib/admin-types";
const validId=(id:string)=>typeof id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function listMedia(search="",page=1):Promise<{rows:MediaItem[];total:number;error:string|null}>{
 const {supabase}=await requireAdmin();if(typeof search!=="string"||search.length>120||!Number.isSafeInteger(page)||page<1||page>10000)return {rows:[],total:0,error:"Pencarian tidak valid."};
 const {data,error}=await supabase.rpc("admin_list_media",{query_text:search,page_number:page});
 const result=data as {rows:MediaItem[];total:number}|null;
 return {rows:Array.isArray(result?.rows)?result.rows:[],total:Number(result?.total??0),error:error?"Library belum bisa dimuat.":null};
}
export async function saveMediaAlt(id:string,alt:string){const {supabase}=await requireAdmin();if(!validId(id)||typeof alt!=="string"||alt.length>300)return {error:"Alt maksimal 300 karakter."};const {error}=await supabase.rpc("admin_update_media_alt",{media_id:id,alt_text:alt});if(!error)revalidatePath("/admin/media");return {error:error?"Alt belum tersimpan. Coba lagi.":null};}
export async function deleteMedia(id:string){
 const {supabase}=await requireAdmin();if(!validId(id))return {error:"Media tidak valid."};
 const {data:path,error}=await supabase.rpc("admin_prepare_media_delete",{media_id:id});
 if(error||typeof path!=="string")return {error:error?.message.includes("masih dipakai")?"Gambar masih dipakai. Ganti gambar pada konten terlebih dahulu.":"Media belum bisa dihapus."};
 const {error:removeError}=await supabase.storage.from("media").remove([path]);
 if(removeError){await supabase.rpc("admin_finish_media_delete",{media_id:id,cancel_delete:true});return {error:"File belum terhapus. Coba lagi."};}
 const {error:finishError}=await supabase.rpc("admin_finish_media_delete",{media_id:id,cancel_delete:false});
 revalidatePath("/admin/media");return {error:finishError?"File terhapus, tetapi metadata belum dibersihkan. Coba hapus sekali lagi.":null};
}
