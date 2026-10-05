"use client";
import { useState } from "react";
import Link from "next/link";
import {settingWaLink,type SiteSettings} from "@/lib/site-settings-schema";
const topik = ["Bantuan akun", "Pembayaran / Premium", "Laporkan konten", "Kerja sama / Sponsor", "Lainnya"];
export default function ContactForm({settings}:{settings:SiteSettings}) {
  const [nama, setNama] = useState(""); const [t, setT] = useState(topik[0]); const [pesan, setPesan] = useState("");
  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const teks = `${settings.whatsappGreeting}\nNama: ${nama}\nTopik: ${t}\n\n${pesan}`;
    window.open(settingWaLink(settings,teks), "_blank", "noopener,noreferrer");
  };
  const f = "w-full rounded-full border border-[#EADFF2] bg-white px-5 py-3";
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/" className="text-sm text-muted">← Beranda</Link>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl3 p-8 text-white shadow-soft" style={{ background: "linear-gradient(135deg,#8E2F9C,#C93A8E)" }}>
          <h1 className="text-3xl font-medium">Butuh bantuan? Kami di sini.</h1>
          <p className="mt-3 opacity-90">Hubungi tim {settings.name} langsung lewat WhatsApp. Kami balas secepatnya di jam kerja.</p>
          <a href={settingWaLink(settings)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-6">Chat WhatsApp →</a>
          <p className="mt-4 text-sm opacity-90">{`+${settings.whatsappNumber.replace(/\D/g,"")}`}</p>
          <p className="mt-8 break-words rounded-2xl bg-white/15 p-4 text-sm">{settings.emergencyText}</p>
        {settings.contactEmail&&<a href={`mailto:${settings.contactEmail}`} className="mt-4 block break-all text-sm underline">{settings.contactEmail}</a>}{settings.emergencyContacts.map((contact,index)=><a key={index} href={contact.url} className="mt-3 block text-sm underline">{contact.label}{contact.phone?` · ${contact.phone}`:""}</a>)}{settings.socials.length>0&&<div className="mt-5 flex flex-wrap gap-4">{settings.socials.map((social,index)=><a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">{social.label}</a>)}</div>}
        </section>
        <form onSubmit={kirim} className="grid gap-3 rounded-xl3 bg-white p-8 shadow-soft">
          <h2 className="text-xl font-semibold">Kirim pesan via WhatsApp</h2>
          <input required value={nama} onChange={(e) => setNama(e.target.value)} aria-label="Nama (boleh panggilan)" placeholder="Nama (boleh panggilan)" className={f} />
          <select aria-label="Topik pesan" value={t} onChange={(e) => setT(e.target.value)} className={f}>{topik.map((x) => <option key={x}>{x}</option>)}</select>
          <textarea required rows={5} value={pesan} onChange={(e) => setPesan(e.target.value)} aria-label="Pesan" placeholder="Tulis pesanmu..." className={`${f} !rounded-3xl`} />
          <button className="btn btn-brand justify-center">Lanjut ke WhatsApp →</button>
          <p className="text-xs text-muted">Pesan akan terbuka di aplikasi WhatsApp kamu, belum terkirim sebelum kamu menekan kirim.</p>
        </form>
      </div>
    </main>
  );
}
