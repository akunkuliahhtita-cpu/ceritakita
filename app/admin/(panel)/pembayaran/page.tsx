import {requireAdmin} from "@/lib/admin";
import {paymentService} from "@/lib/admin-payments";
import PaymentsManager from "@/components/admin/PaymentsManager";
import type {AdminOrder,QrisSettings} from "@/lib/payment-types";
export default async function Page(){
 const {user}=await requireAdmin();
 let settings:QrisSettings={qris_image_url:"",merchant_name:"",instructions:"",expiry_minutes:60,unique_code_enabled:true,provider_label:"DANA"};
 let rows:AdminOrder[]=[];let total=0;let error=false;
 try{const service=paymentService();const [s,o]=await Promise.all([service.from("payment_settings").select("qris_image_url,merchant_name,instructions,expiry_minutes,unique_code_enabled,provider_label").eq("id",1).maybeSingle(),service.rpc("admin_payment_orders",{actor:user.id,search_email:"",filter_status:"",page_number:1,page_size:20})]);
 if(s.data)settings={...s.data,qris_image_url:s.data.qris_image_url??"",merchant_name:s.data.merchant_name??"",instructions:s.data.instructions??""};rows=o.data?.rows??[];total=o.data?.total??0;error=Boolean(s.error||o.error);
 }catch{error=true;}
 return <><h1 className="text-3xl font-medium">Pembayaran & QRIS</h1><p className="mt-2 text-sm text-muted">Atur QRIS DANA dan cocokkan setiap bukti pembayaran sebelum menyetujui.</p><PaymentsManager settings={settings} initialOrders={rows} initialTotal={total} loadError={error}/></>;
}
