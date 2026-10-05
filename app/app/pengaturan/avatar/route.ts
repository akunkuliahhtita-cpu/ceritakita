import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authenticatedClient } from "@/lib/supabase-server";


export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const { supabase, user } = await authenticatedClient();
  const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
  if (!request.body) return fail("Pilih foto profil.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3 * 1024 * 1024) { await reader.cancel(); return fail("Foto maksimal 2 MB.", 413); }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch { return fail("Unggahan tidak valid."); }
  const file = form.get("avatar");
  if (!(file instanceof File)) return fail("Pilih foto yang valid.");
  if (file.size === 0 || file.size > 2 * 1024 * 1024) return fail("Foto maksimal 2 MB.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!mime || mime !== file.type) return fail("Gunakan gambar JPG, PNG, atau WebP yang valid.");
  const {data:profile,error:profileError}=await supabase.from("profiles").select("avatar_url").eq("id",user.id).maybeSingle();
  if(profileError)return fail("Profil belum tersedia.",500);
  const {error:ensureError}=await supabase.from("profiles").upsert({id:user.id,display_name:user.email?.split("@")[0]??"teman"},{onConflict:"id",ignoreDuplicates:true});
  if(ensureError)return fail("Profil belum tersedia.",500);
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return fail("Foto belum terunggah. Coba lagi sebentar, ya.", 502);
  const {error:saveError}=await supabase.from("profiles").update({avatar_url:path}).eq("id",user.id);
  if(saveError){await supabase.storage.from("avatars").remove([path]);return fail("Foto belum tersimpan.",500);}
  if(typeof profile?.avatar_url==="string" && profile.avatar_url.startsWith(`${user.id}/`))await supabase.storage.from("avatars").remove([profile.avatar_url]);
  revalidatePath("/app","layout");
  return NextResponse.json({error:null});
}
