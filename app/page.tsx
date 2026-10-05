import {publicMetadata} from "@/lib/seo";
import CmsLayout from "@/components/cms/CmsRenderer";
import {DEFAULT_HOME_BLOCKS} from "@/lib/cms-defaults";
import {readCmsContext,readPublishedPage} from "@/lib/cms-server";
export const dynamic="force-dynamic";
export async function generateMetadata(){const page=await readPublishedPage("/");return publicMetadata("/",page?.title??"Beranda");}
export default async function Home(){const [page,context]=await Promise.all([readPublishedPage("/"),readCmsContext()]);return <CmsLayout blocks={page?.blocks.length?page.blocks:DEFAULT_HOME_BLOCKS} context={context}/>;}
