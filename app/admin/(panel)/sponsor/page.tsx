import {requireAdmin,logAudit} from "@/lib/admin";
import SponsorsManager from "@/components/admin/SponsorsManager";
import type {SponsorAdmin} from "@/lib/sponsors-schema";
export default async function Page(){const {supabase}=await requireAdmin();await logAudit('sponsor.view','/admin/sponsor');const {data,error}=await supabase.from('sponsors').select('id,name,logo_url,title,description,link_url,placement,start_at,end_at,is_active,clicks,impressions').order('updated_at',{ascending:false});return <SponsorsManager initial={(data??[]) as SponsorAdmin[]} loadError={Boolean(error)}/>;}
