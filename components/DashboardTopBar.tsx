"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardIcon from "./DashboardIcon";
import DashboardLogout from "./DashboardLogout";
import { dashboardLinks } from "./AppNavigation";

export default function DashboardTopBar({ name, avatar, status }: { name: string; avatar: string | null; status: string }) {
  const [search, setSearch] = useState(""); const [imageFailed, setImageFailed] = useState(false);
  const details = useRef<HTMLDetailsElement>(null); const searchBox = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => { setImageFailed(false); }, [avatar]);
  useEffect(() => { setSearch(""); if (details.current) details.current.open = false; }, [pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) details.current.open = false;
      if (event.target instanceof Node && !searchBox.current?.contains(event.target)) setSearch("");
    };
    document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close);
  }, []);
  const matches = dashboardLinks.filter(link => link.label.toLocaleLowerCase("id-ID").includes(search.toLocaleLowerCase("id-ID").trim()));
  return <header className="dashboard-topbar">
    <div ref={searchBox} className="dashboard-search"><DashboardIcon name="search" /><label htmlFor="dashboard-search" className="sr-only">Cari halaman CeritaKita</label><input id="dashboard-search" type="search" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setSearch(""); }} placeholder="Cari ruang untukmu…" autoComplete="off" aria-controls={search.trim() ? "dashboard-search-results" : undefined} />{search.trim() && <div id="dashboard-search-results" className="dashboard-search-results"><p className="mb-2 text-[10px] text-muted">HALAMAN</p>{matches.length ? matches.map(link => <Link key={link.href} href={link.href} onClick={() => setSearch("")}><DashboardIcon name={link.icon} />{link.label}</Link>) : <p role="status" className="text-xs text-muted">Belum ada halaman dengan nama itu.</p>}</div>}</div>
    <details ref={details} className="dashboard-profile" onKeyDown={event => { if (event.key === "Escape" && details.current) { details.current.open = false; details.current.querySelector("summary")?.focus(); } }}><summary><span className="dashboard-avatar">{avatar && !imageFailed ? <img src={avatar} alt="" width={42} height={42} onError={() => setImageFailed(true)} /> : name.slice(0, 1).toLocaleUpperCase("id-ID")}</span><span className="dashboard-profile-text"><strong>{name}</strong><small>{status === "Premium" ? "✦ Premium" : status}</small></span><span aria-hidden="true" className="text-muted">⌄</span></summary><div className="dashboard-profile-menu"><p className="mb-3 border-b border-[#EADFF2] pb-3 text-xs text-muted">Ruang pribadimu</p>{[{ href: "/app/pengaturan", label: "Pengaturan" }, { href: "/app/pengaturan?tab=profil", label: "Profil" }, { href: "/app/premium", label: "Langganan" }, { href: "/kontak", label: "Bantuan" }].map(link => <Link key={link.label} href={link.href} onClick={() => { if (details.current) details.current.open = false; }}>{link.label}</Link>)}<DashboardLogout /></div></details>
  </header>;
}
