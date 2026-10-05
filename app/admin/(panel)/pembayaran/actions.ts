"use server";
import {requireAdmin,logAudit} from "@/lib/admin";
import {paymentService} from "@/lib/admin-payments";
import {paymentStatuses,qrisError,type QrisSettings,type AdminOrder} from "@/lib/payment-types";
import {revalidatePath} from "next/cache";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function refresh(){revalidatePath("/admin","layout");revalidatePath("/app","layout");}
export async function saveQris(settings:QrisSettings){
 const {user}=await requireAdmin();const invalid=qrisError(settings);if(invalid)return {error:invalid};
 try{const {error}=await paymentService().rpc("admin_save_qris",{actor:user.id,settings:{...settings,merchant_name:settings.merchant_name.trim(),provider_label:"DANA"}});if(error)return {error:"Pengaturan belum tersimpan. Pilih QRIS dari library dan pastikan migration sudah diterapkan."};refresh();return {error:null};}catch{return {error:"Layanan pembayaran server belum tersedia."};}
}
export async function loadPaymentOrders(search:string,status:string,page:number):Promise<{rows:AdminOrder[];total:number;error:string|null}>{
 const {user}=await requireAdmin();if(typeof search!=="string"||search.length>254||!['',...paymentStatuses].includes(status)||!Number.isInteger(page)||page<1||page>100000)return {rows:[],total:0,error:"Filter tidak valid."};
 try{const {data,error}=await paymentService().rpc("admin_payment_orders",{actor:user.id,search_email:search.trim(),filter_status:status,page_number:page,page_size:20});if(error)throw Error();return {rows:data?.rows??[],total:data?.total??0,error:null};}catch{return {rows:[],total:0,error:"Order belum bisa dimuat. Periksa layanan server dan migration."};}
}
export async function paymentProof(id:string){
 await requireAdmin();if(!uuid.test(id))return {url:null,error:"Order tidak valid."};
 try{const service=paymentService();const {data:order,error}=await service.from("orders").select("id,user_id,proof_url").eq("id",id).single();
 if(error||!order?.proof_url||!order.proof_url.startsWith(`${order.user_id}/${order.id}/`)||!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(order.proof_url))return {url:null,error:"Bukti pembayaran belum tersedia."};
 await logAudit("payment.proof.view",id,{},service);
 const result=await service.storage.from("proofs").createSignedUrl(order.proof_url,300);
 if(result.error||!result.data?.signedUrl)throw Error();return {url:result.data.signedUrl,error:null};
 }catch{return {url:null,error:"Bukti belum bisa dibuka. Coba lagi, ya."};}
}
async function confirmationEmail(service:ReturnType<typeof paymentService>,actor:string,orderId:string,userId:string,plan:string,until:string){
 const apiKey=process.env.RESEND_API_KEY;if(!apiKey)return "Email tidak dikirim karena Resend belum diaktifkan.";
 const from=process.env.EMAIL_FROM;if(!from)return "Pembayaran disetujui, tetapi alamat pengirim email belum diatur.";
 try{const {data,error}=await service.auth.admin.getUserById(userId);if(error||!data.user?.email)throw Error();
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":`payment-approved-${orderId}`},body:JSON.stringify({from,to:[data.user.email],subject:"Pembayaran CeritaKita disetujui",text:`Pembayaran paket ${plan} telah disetujui. Premium aktif sampai ${new Date(until).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB. Terima kasih sudah bertumbuh bersama CeritaKita.`}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error();await service.from("audit_logs").insert({actor_id:actor,action:"payment.email.sent",target:orderId,meta:{}});return null;
 }catch{return "Pembayaran disetujui, tetapi email konfirmasi belum terkirim. Jangan setujui ulang order ini.";}
}
export async function verifyPayment(id:string,decision:"paid"|"rejected",reason:string){
 const {user}=await requireAdmin();if(!uuid.test(id)||!['paid','rejected'].includes(decision)||typeof reason!=="string"||reason.length>1000||(decision==="rejected"&&!reason.trim()))return {error:"Alasan penolakan wajib diisi, maksimal 1.000 karakter.",warning:null};
 try{const service=paymentService();const {data,error}=await service.rpc("admin_verify_payment",{actor:user.id,order_id:id,decision,rejection_reason:reason.trim()});
 if(error||!data)return {error:"Order belum berubah. Hanya order dengan bukti yang menunggu verifikasi bisa diproses.",warning:null};
 refresh();const warning=decision==="paid"?await confirmationEmail(service,user.id,id,data.user_id,data.plan_name,data.premium_until):null;
 return {error:null,warning};
 }catch{return {error:"Layanan pembayaran server belum tersedia.",warning:null};}
}
