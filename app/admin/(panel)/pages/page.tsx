import {requireAdmin} from "@/lib/admin";
import {readCmsContext} from "@/lib/cms-server";
import {normalizeBlocks,type CmsPage} from "@/lib/cms";
import PagesManager from "@/components/admin/PagesManager";
export default async function Page(){const {supabase}=await requireAdmin();const [{data,error},context]=await Promise.all([supabase.from("pages").select("id,slug,title,status,blocks,has_draft,updated_at").order("slug"),readCmsContext()]);const pages:CmsPage[]=(data??[]).map(p=>({...p,blocks:normalizeBlocks(p.blocks)}));return <><h1 className="text-3xl font-medium">Halaman & CMS</h1><p className="mt-2 text-sm text-muted">Susun blok, lihat preview, lalu simpan draft atau publikasikan.</p><PagesManager pages={pages} context={context} loadError={Boolean(error)}/></>;}
