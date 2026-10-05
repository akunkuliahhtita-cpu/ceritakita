"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import DashboardIcon, { type DashboardIconName } from "./DashboardIcon";
import DashboardLogout from "./DashboardLogout";

export const dashboardLinks: { href: string; label: string; icon: DashboardIconName }[] = [
  { href: "/app", label: "Beranda", icon: "home" }, { href: "/app/cerita", label: "Cerita", icon: "story" },
  { href: "/app/mood", label: "Mood", icon: "mood" }, { href: "/app/jurnal", label: "Jurnal", icon: "journal" },
  { href: "/app/edukasi", label: "Edukasi", icon: "education" }, { href: "/app/premium", label: "Premium", icon: "premium" },
  { href: "/app/review", label: "Ulasan", icon: "review" }, { href: "/app/pengaturan?tab=profil", label: "Profil", icon: "profile" },
  { href: "/app/pengaturan", label: "Pengaturan", icon: "profile" },
  { href: "/kontak", label: "Kontak", icon: "contact" },
];

export default function AppNavigation() {
  const pathname = usePathname(); const moreRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (moreRef.current) moreRef.current.open = false; }, [pathname]);
  const isActive = (href: string) => href === "/app" ? pathname === href : (!href.includes("?") && (pathname === href || pathname.startsWith(`${href}/`)));
  return <>
    <aside className="dashboard-sidebar">
      <Link href="/app" className="dashboard-wordmark"><span className="dashboard-logo-disc"><Image src="/logo-mark.png" alt="" width={36} height={36} /></span>CeritaKita</Link>
      <p className="dashboard-nav-caption">RUANG UNTUKMU</p>
      <nav aria-label="Navigasi dashboard" className="dashboard-sidebar-links">{dashboardLinks.map(link => <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`dashboard-nav-link ${isActive(link.href) ? "is-current" : ""}`}><DashboardIcon name={link.icon} />{link.label}{isActive(link.href) && <span className="dashboard-active-dot" />}</Link>)}</nav>
      <div className="dashboard-sidebar-bottom"><p>Pelan-pelan juga<br />tetap berarti.</p><DashboardLogout /></div>
    </aside>
    <nav aria-label="Navigasi mobile" className="dashboard-bottom-nav">{dashboardLinks.slice(0, 5).map(link => <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={isActive(link.href) ? "is-current" : ""}><DashboardIcon name={link.icon} /><span>{link.label}</span></Link>)}
      <details ref={moreRef} className="dashboard-more" onKeyDown={event => { if (event.key === "Escape" && moreRef.current) { moreRef.current.open = false; moreRef.current.querySelector("summary")?.focus(); } }}><summary className={dashboardLinks.slice(5).some(link => isActive(link.href)) ? "is-current" : ""}><DashboardIcon name="more" /><span>Lainnya</span></summary><div className="dashboard-more-panel"><p className="mb-3 text-xs text-muted">Ruang lainnya</p>{dashboardLinks.slice(5).map(link => <Link key={link.href} href={link.href} onClick={() => { if (moreRef.current) moreRef.current.open = false; }}><DashboardIcon name={link.icon} />{link.label}</Link>)}<DashboardLogout /></div></details>
    </nav>
  </>;
}
