import {NextResponse} from "next/server";
import {requireAdmin,logAudit} from "@/lib/admin";
import {paymentService} from "@/lib/admin-payments";
import {csvCell,paymentStatuses,type AdminOrder} from "@/lib/payment-types";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const {user}=await requireAdmin();const query=new URL(request.url).searchParams;const search=query.get("search")??"",status=query.get("status")??"";
 if(search.length>254||!['',...paymentStatuses].includes(status))return NextResponse.json({error:"Filter tidak valid."},{status:400});
 try{const service=paymentService();await logAudit("payment.orders.export","orders",{search,status},service);
 const getPage=(page:number)=>service.rpc("admin_payment_orders",{actor:user.id,search_email:search,filter_status:status,page_number:page,page_size:1000});
 const first=await getPage(1);if(first.error)throw Error();const encoder=new TextEncoder();
 const stream=new ReadableStream<Uint8Array>({async start(controller){try{controller.enqueue(encoder.encode("\uFEFF"+["ID","Email","Paket","Total IDR","Status","Dibuat","Kedaluwarsa","Alasan","Diverifikasi"].map(csvCell).join(",")+"\r\n"));let data=first.data;let page=1;while(true){const rows:AdminOrder[]=data?.rows??[];for(const o of rows)controller.enqueue(encoder.encode([o.id,o.email,o.plan_name,o.total_amount,o.status,o.created_at,o.expires_at,o.note,o.verified_at].map(csvCell).join(",")+"\r\n"));if(rows.length<1000||page*1000>=(data?.total??0))break;const next=await getPage(++page);if(next.error)throw Error();data=next.data;}controller.close();}catch{controller.error(new Error("Ekspor belum selesai. Unduh ulang, ya."));}}});
 return new Response(stream,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="ceritakita-orders-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"CSV belum bisa diunduh."},{status:503});}
}
