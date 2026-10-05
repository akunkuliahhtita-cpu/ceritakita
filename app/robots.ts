import type {MetadataRoute} from "next";
import {readSeo,canonicalBase} from "@/lib/seo";
import {robotsRules} from "@/lib/seo-schema";
export const dynamic='force-dynamic';
export default async function robots():Promise<MetadataRoute.Robots>{const seo=await readSeo(),base=canonicalBase(seo),parsed=robotsRules(seo.robots);return {rules:parsed.rules,sitemap:[...new Set([...parsed.sitemap,...(base?[base+'/sitemap.xml']:[])])],...(parsed.host?{host:parsed.host}:{})};}
