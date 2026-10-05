import "server-only";
import {createClient} from "@supabase/supabase-js";
export function paymentService(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Layanan pembayaran server belum tersedia.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
