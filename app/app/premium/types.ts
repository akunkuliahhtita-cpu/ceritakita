export type Plan = { id: string; name: string; price: number; period: string; highlighted?:boolean; features: string[] };
export type PaymentOrder = {
  id: string; planName: string; baseAmount: number; uniqueCode: number; total: number;
  status: string; expiresAt: string; qris: string | null; merchant: string | null;
  instructions: string | null; note: string | null; proofLink: string | null;
};
export const rupiah = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
