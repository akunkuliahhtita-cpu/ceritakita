import {publicMetadata} from "@/lib/seo";
import {readSiteSettings} from "@/lib/site-settings";
import ContactForm from "@/components/ContactForm";
export const dynamic="force-dynamic";
export async function generateMetadata(){return publicMetadata("/kontak","Kontak");}
export default async function ContactPage(){return <ContactForm settings={await readSiteSettings()}/>;}
