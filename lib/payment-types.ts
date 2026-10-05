export const paymentStatuses=["pending","awaiting_verification","paid","rejected","expired"] as const;
export type OrderStatus=typeof paymentStatuses[number];
export const paymentStatusLabels:Record<OrderStatus,string>={pending:"Menunggu bayar",awaiting_verification:"Menunggu verifikasi",paid:"Disetujui",rejected:"Ditolak",expired:"Kedaluwarsa"};
export type AdminOrder={id:string;email:string;plan_name:string;total_amount:number;status:OrderStatus;created_at:string;expires_at:string;note:string|null;has_proof:boolean;verified_at:string|null};
export type QrisSettings={qris_image_url:string;merchant_name:string;instructions:string;expiry_minutes:number;unique_code_enabled:boolean;provider_label:string};
export function qrisError(value:QrisSettings){
 if(!value||typeof value.merchant_name!=="string"||!value.merchant_name.trim()||value.merchant_name.length>120)return "Isi nama merchant, maksimal 120 karakter.";
 if(typeof value.instructions!=="string"||!value.instructions.trim()||value.instructions.length>5000)return "Isi instruksi pembayaran, maksimal 5.000 karakter.";
 if(typeof value.qris_image_url!=="string"||!/^https:\/\//.test(value.qris_image_url)||value.qris_image_url.length>2000)return "Pilih gambar QRIS merchant asli dari library.";
 if(!Number.isInteger(value.expiry_minutes)||value.expiry_minutes<1||value.expiry_minutes>1440)return "Durasi kedaluwarsa antara 1 dan 1.440 menit.";
 if(typeof value.unique_code_enabled!=="boolean")return "Pilihan kode unik tidak valid.";
 return null;
}
export function csvCell(value:unknown){let text=String(value??"");if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
