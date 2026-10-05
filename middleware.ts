import {createClient} from "@supabase/supabase-js";
import {safeSource,redirectDestination} from "@/lib/seo-schema";
import {createServerClient,type CookieOptions} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});const pathname=request.nextUrl.pathname;
 const adminRoute=pathname==="/admin"||pathname.startsWith("/admin/");const adminLogin=pathname==="/admin/masuk";
 const redirectTo=(path:string)=>{const target=request.nextUrl.clone();target.pathname=path;target.search="";if(path==="/masuk")target.searchParams.set("next",pathname);const redirect=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;};
 if(adminRoute||pathname==="/app"||pathname.startsWith("/app/"))response.headers.set("X-Robots-Tag","noindex, nofollow");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!adminRoute&&pathname!=="/app"&&!pathname.startsWith("/app/")&&pathname!=="/masuk"){
  if(url&&key&&safeSource(pathname))try{const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data}=await client.from("seo_redirects").select("destination").eq("source",pathname).eq("active",true).maybeSingle();if(data&&redirectDestination(data.destination)){const target=new URL(data.destination,request.url);if(target.pathname!==pathname||target.origin!==request.nextUrl.origin)return NextResponse.redirect(target,301);}}catch{/* Public pages retain their fallback when the database is unavailable. */}
  return response;
 }
 if(!url||!key)return adminLogin||pathname==="/masuk"?response:redirectTo(adminRoute?"/admin/masuk":"/masuk");
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values:{name:string;value:string;options:CookieOptions}[]){values.forEach(({name,value})=>request.cookies.set(name,value));const previous=response.cookies.getAll();response=NextResponse.next({request});previous.forEach(cookie=>response.cookies.set(cookie));if(adminRoute||pathname==="/app"||pathname.startsWith("/app/"))response.headers.set("X-Robots-Tag","noindex, nofollow");values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user||!user.email_confirmed_at)return adminLogin||pathname==="/masuk"?response:redirectTo(adminRoute?"/admin/masuk":"/masuk");
 const {data:profile,error:roleError}=await supabase.from("profiles").select("role,suspended_at").eq("id",user.id).single();
 if(profile?.suspended_at)return redirectTo("/ditangguhkan");
 const isAdmin=!roleError&&profile?.role==="admin";
 if(adminRoute){
 // Let POST server actions return their errors rather than redirecting an existing session.
 if(adminLogin){if(isAdmin&&request.method==="GET")return redirectTo("/admin");return response;}
 if(!isAdmin)return redirectTo("/admin/masuk");
 }else if(isAdmin&&(pathname==="/masuk"||pathname==="/app"||pathname.startsWith("/app/")))return redirectTo("/admin");
 return response;
}
export const config={matcher:["/app/:path*","/admin/:path*","/masuk","/((?!api/|api$|_next/static|_next/image|.*\\.).*)"]};
