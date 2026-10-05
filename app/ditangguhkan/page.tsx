import {publicMetadata} from "@/lib/seo";
import Link from "next/link";
import {adminClient} from "@/lib/admin";
import {redirect} from "next/navigation";
export async function generateMetadata(){return {...await publicMetadata("/ditangguhkan","Akun ditangguhkan"),robots:{index:false,follow:false}};}
async function logout(){"use server";const client=await adminClient();await client.auth.signOut({scope:"local"});redirect("/masuk");}
export default function Page(){return <main className="mx-auto flex min-h-[70vh] max-w-xl items-center p-5"><section className="rounded-[36px] bg-white p-8 shadow-soft"><h1 className="text-3xl font-medium text-purple-800">Akunmu ditangguhkan</h1><p className="mt-4 text-sm leading-relaxed text-muted">Akses aplikasi dibatasi setelah peninjauan moderasi. Hubungi tim CeritaKita jika kamu ingin meminta peninjauan kembali.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/kontak" className="btn btn-brand">Hubungi bantuan →</Link><form action={logout}><button type="submit" className="btn btn-ghost">Keluar</button></form></div></section></main>;}
