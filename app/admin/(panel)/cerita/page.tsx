import {requireAdmin} from "@/lib/admin";
import StoryModeration from "@/components/admin/StoryModeration";
import type {ModerationStory} from "@/lib/moderation-types";
export default async function Page(){const {supabase}=await requireAdmin();const {data,error}=await supabase.rpc("admin_story_queue");return <><h1 className="text-3xl font-medium">Moderasi cerita & komentar</h1><p className="mt-2 text-sm text-muted">Alias ditampilkan untuk menjaga anonimitas. Laporan berulang adalah tanda untuk ditinjau, bukan bukti pelanggaran.</p><StoryModeration rows={(data??[]) as ModerationStory[]} loadError={Boolean(error)}/></>;}
