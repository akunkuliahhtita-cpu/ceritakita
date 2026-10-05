"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/admin";
import {validatePlan} from "@/lib/plan-validation";
import type {PlanInput} from "@/lib/admin-types";
function refresh(){revalidatePath("/admin/plans");revalidatePath("/app/premium");revalidatePath("/");}
export async function savePlan(input:PlanInput){const {supabase}=await requireAdmin();const invalid=validatePlan(input);if(invalid)return {error:invalid};if(input.id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id))return {error:"Paket tidak valid."};const {error}=await supabase.rpc("admin_save_plan",{payload:{...input,name:input.name.trim(),features:input.features.map(f=>f.trim())}});if(error)return {error:error.code==="23505"?"Slug sudah digunakan paket lain.":"Paket belum tersimpan. Periksa isian dan coba lagi."};refresh();return {error:null};}
export async function deletePlan(id:string){const {supabase}=await requireAdmin();if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {error:"Paket tidak valid."};const {error}=await supabase.rpc("admin_delete_plan",{plan_id:id});if(error)return {error:error.message.includes("masih dipakai")?"Paket masih dipakai pesanan. Nonaktifkan paket saja.":"Paket belum terhapus."};refresh();return {error:null};}
