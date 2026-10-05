import Link from "next/link";
import {notFound} from "next/navigation";
import {requireAdmin} from "../../auth";
const titles:Record<string,string>={pages:"Pages",media:"Media",plans:"Plans",pembayaran:"Pembayaran",review:"Review",cerita:"Cerita",edukasi:"Edukasi",sponsor:"Sponsor",seo:"SEO",pengguna:"Pengguna",pengaturan:"Pengaturan","audit-log":"Audit Log"};
export default async function AdminSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;if(!Object.hasOwn(titles,section))notFound();const {supabase}=await requireAdmin();
 if(section==="audit-log"){
 const {data,error}=await supabase.from("audit_logs").select("id,action,target,created_at").order("created_at",{ascending:false}).limit(100);
 return <main className="rounded-[28px] bg-white p-6 shadow-soft"><h1 className="mb-5 text-2xl font-medium">Audit Log</h1>{error?<p role="status">Data belum tersedia. Coba lagi sebentar.</p>:data?.length?<ul className="divide-y divide-[#EADFF2]">{data.map(log=><li key={log.id} className="py-4"><strong className="text-sm">{log.action==="admin.login"?"Login admin":log.action}</strong><p className="mt-1 text-xs text-muted">{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date(log.created_at))} WIB · {log.target}</p></li>)}</ul>:<p className="text-sm text-muted">Belum ada aktivitas admin tercatat.</p>}</main>;
 }
 return <main className="rounded-[28px] bg-white p-7 shadow-soft"><h1 className="text-2xl font-medium">{titles[section]}</h1><p className="my-4 text-sm leading-relaxed text-muted">Halaman pengelolaan ini belum dibuat. Ringkasan operasional tersedia di Dashboard.</p><Link href="/admin" className="btn btn-ghost text-sm">Kembali ke Dashboard →</Link></main>;
}
