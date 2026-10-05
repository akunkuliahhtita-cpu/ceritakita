"use client";

import { usePathname } from "next/navigation";
import { settingWaLink,DEFAULT_SITE_SETTINGS } from "@/lib/site-settings-schema";

export default function WhatsAppFab({number=DEFAULT_SITE_SETTINGS.whatsappNumber,greeting=DEFAULT_SITE_SETTINGS.whatsappGreeting}:{number?:string;greeting?:string}) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  const dashboard = pathname === "/app" || pathname.startsWith("/app/");
  return (
    <a href={settingWaLink({whatsappNumber:number,whatsappGreeting:greeting})} target="_blank" rel="noopener noreferrer" aria-label="Chat WhatsApp CeritaKita"
      className={`btn btn-brand whatsapp-help z-20 shadow-soft ${dashboard ? "!mb-[calc(6rem+env(safe-area-inset-bottom))] md:!mb-0" : ""}`}><span aria-hidden="true" className="help-icon">💬</span> Butuh bantuan?</a>
  );
}
