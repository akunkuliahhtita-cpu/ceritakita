import MediaLibrary from "@/components/admin/MediaLibrary";
import {listMedia} from "./actions";
export const metadata={title:"Media Library"};
export default async function MediaPage(){const initial=await listMedia();return <main className="rounded-[28px] bg-white p-5 shadow-soft sm:p-7"><h1 className="text-2xl font-medium">Media Library</h1><p className="mb-6 mt-2 text-sm text-muted">Kelola gambar publik, isi alt text, dan gunakan di seluruh panel.</p><MediaLibrary initial={initial}/></main>;}
