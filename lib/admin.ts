import {createServerClient,type CookieOptions} from "@supabase/ssr";
import type {SupabaseClient} from "@supabase/supabase-js";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
export async function adminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)redirect("/admin/masuk");const store=await cookies();
 return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(values:{name:string;value:string;options:CookieOptions}[]){try{values.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Middleware refreshes cookies in server components. */}}}});
}
export async function requireAdmin(){const supabase=await adminClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user||!user.email_confirmed_at)redirect("/admin/masuk");const {data:profile,error:roleError}=await supabase.from("profiles").select("role,display_name").eq("id",user.id).single();if(roleError||profile?.role!=="admin")redirect("/admin/masuk");return {supabase,user,name:profile.display_name??"Admin"};}
export async function logAudit(action:string,target:string,meta:Record<string,unknown>={},service?:SupabaseClient){
 const {supabase,user}=await requireAdmin();
 if(!action.trim()||action.length>100||target.length>200||JSON.stringify(meta).length>128000)throw new Error("Catatan audit tidak valid.");
 if(service){const {error}=await service.from("audit_logs").insert({actor_id:user.id,action,target,meta});if(error)throw new Error("Catatan audit belum tersimpan.");return;}
 const {error}=await supabase.rpc("record_admin_audit",{audit_action:action,audit_target:target,audit_meta:meta});if(error)throw new Error("Catatan audit belum tersimpan.");
}
