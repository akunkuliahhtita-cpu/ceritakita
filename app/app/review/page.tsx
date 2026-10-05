import type { Metadata } from "next";
import { authenticatedClient } from "@/lib/supabase-server";
import { readReviews } from "@/lib/reviews";
import ReviewBoard from "@/components/ReviewBoard";
import ReviewEditor from "@/components/ReviewEditor";
import type { OwnReview } from "./types";
export const metadata:Metadata={title:"Ulasanmu"};
export default async function UserReviewPage(){
  const {supabase,user}=await authenticatedClient();
  const [{reviews,error},{data:row,error:ownError}]=await Promise.all([readReviews(supabase),supabase.from("reviews").select("id,rating,title,body,status,admin_note").eq("user_id",user.id).maybeSingle()]);
  const own:OwnReview|null=row?{id:row.id,rating:row.rating,title:row.title??"",body:row.body??"",status:row.status,note:row.admin_note}:null;
  return <><p className="text-xs tracking-[.15em] text-purple-800">PENGALAMANMU BERARTI</p><h1 className="mt-4 text-3xl font-medium tracking-tight">Ulasan CeritaKita</h1><p className="mt-3 text-sm text-muted">Satu ulasan untuk setiap pengguna. Kamu bisa memperbarui pengalamanmu kapan saja.</p>{ownError?<p role="alert" className="mt-6 rounded-2xl bg-peach p-5 text-sm">Ulasanmu belum bisa dimuat. Coba muat ulang sebelum mengedit.</p>:<ReviewEditor key={own?`${own.id}:${own.rating}:${own.title}:${own.body}:${own.status}`:"new"} own={own}/>}<ReviewBoard reviews={reviews} authenticated loadError={error}/></>;
}
