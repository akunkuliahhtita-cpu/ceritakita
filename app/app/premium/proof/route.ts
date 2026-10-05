import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authenticatedClient } from "@/lib/supabase-server";
import { staticQrisProvider } from "../provider";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const { supabase, user } = await authenticatedClient();
  const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
  if (!request.body) return fail("Pilih gambar bukti pembayaran.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 6 * 1024 * 1024) { await reader.cancel(); return fail("Bukti maksimal 5 MB.", 413); }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch { return fail("Unggahan tidak valid."); }
  const orderId = form.get("orderId");
  const file = form.get("proof");
  if (typeof orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId) || !(file instanceof File)) return fail("Pilih pesanan dan gambar bukti yang valid.");
  if (file.size === 0 || file.size > 5 * 1024 * 1024) return fail("Bukti maksimal 5 MB.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!mime || mime !== file.type) return fail("Gunakan gambar JPG, PNG, atau WebP yang valid.");
  const { data: order, error: orderError } = await supabase.from("orders").select("id,status,expires_at").eq("id", orderId).eq("user_id", user.id).single();
  if (orderError || !order || !["pending", "rejected"].includes(order.status) || new Date(order.expires_at).getTime() <= Date.now()) return fail("Pesanan sudah kedaluwarsa atau tidak bisa menerima bukti.");
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const path = `${user.id}/${orderId}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("proofs").upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) return fail("Bukti belum terunggah. Coba lagi sebentar, ya.", 502);
  const result = await staticQrisProvider.submitProof(supabase, orderId, path);
  if (result.error) {
    await supabase.storage.from("proofs").remove([path]);
    return fail("Bukti belum tersimpan pada pesanan. Pesanan mungkin sudah kedaluwarsa.");
  }
  revalidatePath("/app/premium");
  revalidatePath("/admin", "layout");
  return NextResponse.json({ error: null });
}
