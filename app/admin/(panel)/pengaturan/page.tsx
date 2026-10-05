import {requireAdmin} from "@/lib/admin";
import {parseSiteSettings} from "@/lib/site-settings-schema";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
export const metadata={title:"Pengaturan Situs"};
export default async function SiteSettingsPage(){const {supabase}=await requireAdmin();const {data,error}=await supabase.from("site_settings").select("key,value").in("key",["public_settings","crisis_help"]);const settings=parseSiteSettings(data?.find(row=>row.key==="public_settings")?.value,data?.find(row=>row.key==="crisis_help")?.value);return <main className="rounded-[28px] bg-white p-5 shadow-soft sm:p-7"><h1 className="text-2xl font-medium">Pengaturan Situs</h1><p className="mb-6 mt-2 text-sm text-muted">Pengaturan ini digunakan di landing, footer, kontak, dan tombol bantuan.</p><SiteSettingsForm initial={settings} loadError={Boolean(error)}/></main>;}
