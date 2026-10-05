import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {paymentService} from "@/lib/admin-payments";
import {revalidatePath} from "next/cache";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;const authorization=request.headers.get("authorization")??"";
 const expected=secret?`Bearer ${secret}`:"";const actualBytes=Buffer.from(authorization),expectedBytes=Buffer.from(expected);
 if(!secret||actualBytes.length!==expectedBytes.length||!timingSafeEqual(actualBytes,expectedBytes))return NextResponse.json({error:"Tidak diizinkan."},{status:401});
 try{const {data,error}=await paymentService().rpc("expire_payment_orders");if(error)throw Error();revalidatePath("/admin","layout");revalidatePath("/app/premium");return NextResponse.json({expired:data??0},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({error:"Order belum bisa diperbarui."},{status:503});}
}
