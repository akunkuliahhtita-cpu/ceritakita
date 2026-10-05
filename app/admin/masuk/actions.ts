"use server";
import {createHash} from "node:crypto";
import {isIP} from "node:net";
import {headers} from "next/headers";
import {createClient} from "@supabase/supabase-js";
import {redirect} from "next/navigation";
import {adminClient} from "../auth";
export type LoginState={error:string|null};
export async function loginAdmin(_previous:LoginState,form:FormData):Promise<LoginState>{
 const generic={error:"Email atau password salah"};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return generic;
 const requestHeaders=await headers();
 // Only Vercel's platform-owned header is trusted. Else use a shared, fail-closed bucket.
 const candidate=process.env.VERCEL==="1"?requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim():null;
 const ip=candidate&&isIP(candidate)?candidate:"untrusted-origin";
 const ipHash=createHash("sha256").update(ip).digest("hex");
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:allowed,error:limitError}=await admin.rpc("consume_admin_login",{ip_hash:ipHash});
 if(limitError)return generic;if(!allowed)return {error:"Terlalu banyak percobaan. Coba lagi dalam 10 menit."};
 const email=form.get("email");const password=form.get("password");
 if(typeof email!=="string"||typeof password!=="string"||email.length>254||password.length>1024||!email.trim()||!password)return generic;
 const supabase=await adminClient();
 const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
 if(error||!data.user||!data.session)return generic;
 const {data:profile,error:roleError}=await supabase.from("profiles").select("role").eq("id",data.user.id).single();
 if(roleError||!data.user.email_confirmed_at){await supabase.auth.signOut({scope:"local"});return generic;}
 if(profile?.role!=="admin"){await supabase.auth.signOut({scope:"local"});return {error:"Akun ini tidak punya akses admin"};}
 const {error:auditError}=await admin.from("audit_logs").insert({actor_id:data.user.id,action:"admin.login",target:"admin",meta:{}});
 if(auditError){await supabase.auth.signOut({scope:"local"});return generic;}
 redirect("/admin");
}
export async function logoutAdmin(){const supabase=await adminClient();const {error}=await supabase.auth.signOut({scope:"local"});if(error)redirect("/admin?error=keluar");redirect("/admin/masuk");}
