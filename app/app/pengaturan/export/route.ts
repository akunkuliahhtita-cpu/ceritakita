import { NextResponse } from "next/server";
import { authenticatedClient } from "@/lib/supabase-server";
export async function GET() {
 const {supabase,user}=await authenticatedClient();
 async function readAll(source:"mood"|"journal"|"stories"){
  const rows:unknown[]=[];
  for(let offset=0;;){
   const query=source==="mood"?supabase.from("mood_entries").select("id,day,score,emotions,note").eq("user_id",user.id).order("id")
    :source==="journal"?supabase.from("journal_entries").select("id,title,content,mood_score,created_at").eq("user_id",user.id).order("id")
    :supabase.rpc("export_my_stories").order("id");
   const {data,error}=await query.range(offset,offset+999);if(error)throw new Error("export");rows.push(...(data??[]));if(!data?.length)return rows;offset+=data.length;
  }
 }
 try{
 const [mood,jurnal,cerita]=await Promise.all([readAll("mood"),readAll("journal"),readAll("stories")]);
 return new Response(JSON.stringify({exported_at:new Date().toISOString(),mood,jurnal,cerita},null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":'attachment; filename="ceritakita-data.json"',"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Data belum bisa diekspor. Coba lagi sebentar, ya."},{status:500});}
}
