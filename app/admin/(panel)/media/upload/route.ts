import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "@/lib/admin";
export async function POST(request:Request){
 const fail=(error:string,status=400)=>NextResponse.json({error},{status});
 if(request.headers.get("origin")!==new URL(request.url).origin)return fail("Permintaan tidak valid.",403);
 const {supabase,user}=await requireAdmin();if(!request.body)return fail("Pilih gambar.");
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6*1024*1024){await reader.cancel();return fail("Gambar maksimal 5 MB.",413);}chunks.push(value);}
 let form:FormData;try{form=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();}catch{return fail("Unggahan tidak valid.");}
 const file=form.get("image");if(!(file instanceof File)||file.size===0||file.size>5*1024*1024)return fail("Pilih gambar maksimal 5 MB.");
 const bytes=Buffer.from(await file.arrayBuffer());const mime=bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255?"image/jpeg":bytes.length>=12&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"?"image/webp":null;
 if(!mime||mime!==file.type)return fail("Gunakan JPG, PNG, atau WebP yang valid.");
 const path=`${user.id}/${randomUUID()}.${mime==="image/png"?"png":mime==="image/jpeg"?"jpg":"webp"}`;
 const {error:uploadError}=await supabase.storage.from("media").upload(path,bytes,{contentType:mime,upsert:false});if(uploadError)return fail("Gambar belum terunggah.",502);
 const url=supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
 const name=form.get("name");const {data:id,error}=await supabase.rpc("admin_register_media",{payload:{path,url,name:typeof name==="string"?name.slice(0,200):file.name,alt:"",size:file.size,mime}});
 if(error){const {error:cleanupError}=await supabase.storage.from("media").remove([path]);return fail(cleanupError?"File terunggah, tetapi metadata belum tersimpan dan file belum bisa dibersihkan.":"Metadata atau audit belum tersimpan. Unggahan dibatalkan.",500);}
 revalidatePath("/admin/media");return NextResponse.json({error:null,id});
}
