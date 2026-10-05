import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authenticatedClient } from "@/lib/supabase-server";
export async function POST(request:Request) {
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Permintaan tidak valid."},{status:403});
 const {user}=await authenticatedClient();
 if(Number(request.headers.get("content-length"))>1024)return NextResponse.json({error:"Permintaan tidak valid."},{status:413});
 let body:unknown;try{
 if(!request.body)throw new Error("body");const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();throw new Error("size");}chunks.push(value);}
 body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
 }catch{return NextResponse.json({error:"Konfirmasi tidak valid."},{status:400});}
 if(!body||typeof body!=="object"||!("confirmation" in body)||body.confirmation!=="HAPUS")return NextResponse.json({error:'Ketik "HAPUS" untuk menghapus akun.'},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return NextResponse.json({error:"Penghapusan akun belum tersedia."},{status:503});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 for(;;){
 const {data:files,error}=await admin.rpc("account_storage_files",{target_user:user.id});
 if(!error && !files?.length)break;
 if(error)return NextResponse.json({error:"File akun belum bisa dibersihkan. Coba lagi."},{status:500});
 const grouped=new Map<string,string[]>();
 for(const file of files??[]) {if(typeof file.bucket_id!=="string"||typeof file.name!=="string"||!file.name.startsWith(`${user.id}/`))continue;grouped.set(file.bucket_id,[...(grouped.get(file.bucket_id)??[]),file.name]);}
 for(const [bucket,paths] of grouped)for(let i=0;i<paths.length;i+=100){const {error:removeError}=await admin.storage.from(bucket).remove(paths.slice(i,i+100));if(removeError)return NextResponse.json({error:"File akun belum bisa dibersihkan. Coba lagi."},{status:500});}
 }
 const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
 if(deleteError)return NextResponse.json({error:"Akun belum terhapus. Coba lagi sebentar, ya."},{status:500});
 return NextResponse.json({error:null});
}
