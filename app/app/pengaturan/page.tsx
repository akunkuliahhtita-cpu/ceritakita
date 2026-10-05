import SettingsPanel from "@/components/SettingsPanel";
import { dashboardContext } from "../dashboard-context";
export const metadata={title:"Pengaturan"};
export default async function SettingsPage({searchParams}:{searchParams:Promise<{tab?:string}>}) {
 const {supabase,user,name,avatar}=await dashboardContext();
 const [{data:profile,error:profileError},{data:orders,error:orderError},{data:plans,error:planError},params]=await Promise.all([
 supabase.from("profiles").select("premium_until").eq("id",user.id).maybeSingle(),
 supabase.from("orders").select("id,plan_id,total_amount,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}),
 supabase.from("plans").select("id,name"),searchParams]);
 const history=(orders??[]).map(o=>({id:String(o.id),name:plans?.find(p=>p.id===o.plan_id)?.name??"Paket sebelumnya",amount:Number(o.total_amount),status:String(o.status),date:String(o.created_at)}));
 const paid=history.find(o=>o.status==="paid");
 const active=profile?.premium_until && new Date(profile.premium_until).getTime()>Date.now();
 return <><p className="text-xs tracking-widest text-purple-800">RUANG PRIBADIMU</p><h1 className="my-4 text-3xl font-medium">Pengaturan</h1><SettingsPanel name={name} avatar={avatar} email={user.email??""} initialTab={params.tab??"profil"} until={profile?.premium_until??null} plan={active?paid?.name??"Premium":"Gratis"} history={history} loadError={Boolean(profileError||orderError||planError)} /></>;
}
