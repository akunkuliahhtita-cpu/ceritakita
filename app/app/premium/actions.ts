"use server";

import { revalidatePath } from "next/cache";
import { authenticatedClient } from "@/lib/supabase-server";
import { staticQrisProvider } from "./provider";

export async function createOrder(planId: string) {
  if (typeof planId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) return { error: "Paket tidak valid." };
  const { supabase } = await authenticatedClient();
  const result = await staticQrisProvider.createOrder(supabase, planId);
  if (result.error || !result.orderId) {
    const known = ["Selesaikan pesanan sebelumnya dulu, ya.", "Maksimal 5 pesanan per hari.", "QRIS belum tersedia", "Paket tidak tersedia", "Kode pembayaran sedang penuh. Coba lagi nanti."];
    return { error: known.includes(result.error?.message ?? "") ? result.error!.message : "Pesanan belum bisa dibuat. Coba lagi sebentar, ya." };
  }
  revalidatePath("/app/premium");
  return { error: null, orderId: result.orderId };
}
