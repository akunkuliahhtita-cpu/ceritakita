import type { SupabaseClient } from "@supabase/supabase-js";

type Result = { error: { message: string } | null; orderId?: string };
interface PaymentProvider {
  createOrder(client: SupabaseClient, planId: string): Promise<Result>;
  submitProof(client: SupabaseClient, orderId: string, path: string): Promise<Result>;
}

export const staticQrisProvider: PaymentProvider = {
  async createOrder(client, planId) {
    const { data, error } = await client.rpc("create_premium_order", { selected_plan: planId });
    return { error, orderId: typeof data === "string" ? data : undefined };
  },
  async submitProof(client, orderId, path) {
    const { error } = await client.rpc("submit_order_proof", { order_id: orderId, proof_path: path });
    return { error };
  },
};
