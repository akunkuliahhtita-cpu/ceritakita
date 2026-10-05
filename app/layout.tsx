import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import WhatsAppFab from "@/components/WhatsAppFab";
import {readSiteSettings} from "@/lib/site-settings";
import {globalMetadata,readSeo,siteJsonLd} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Analytics from "@/components/Analytics";
import SiteFavicon from "@/components/SiteFavicon";
const font = Plus_Jakarta_Sans({ subsets: ["latin"] });
export async function generateMetadata():Promise<Metadata>{return globalMetadata();}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings,seo,structured]=await Promise.all([readSiteSettings(),readSeo(),siteJsonLd()]);
  return <html lang="id"><body className={font.className}>{children}<JsonLd data={structured}/><Analytics id={seo.analyticsId}/><SiteFavicon url={settings.faviconUrl}/><WhatsAppFab number={settings.whatsappNumber} greeting={settings.whatsappGreeting}/></body></html>;
}
