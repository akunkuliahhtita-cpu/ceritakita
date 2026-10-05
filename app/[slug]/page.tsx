import {publicMetadata} from "@/lib/seo";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import CmsLayout from "@/components/cms/CmsRenderer";
import {blankBlock} from "@/lib/cms";
import {readCmsContext,readPublishedPage} from "@/lib/cms-server";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const page=await readPublishedPage(slug);return page?publicMetadata("/"+slug,page.title):{title:"Halaman tidak ditemukan",robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))notFound();const page=await readPublishedPage(slug);if(!page)notFound();const context=await readCmsContext();return <CmsLayout home={false} blocks={page.blocks.length?page.blocks:[{...blankBlock("text","empty-page"),title:page.title}]} context={context}/>;}
