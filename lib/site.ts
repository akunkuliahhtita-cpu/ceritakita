// Nomor WhatsApp bisa diganti lewat env, nanti dipindah ke Admin > Pengaturan Situs.
export const WA_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285742294415").replace(/\D/g, "");
export const WA_DISPLAY = "+62 857-4229-4415";
export const waLink = (text?: string) => `https://wa.me/${WA_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
