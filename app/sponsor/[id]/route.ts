import {NextResponse,type NextRequest} from "next/server";
import {publicReviewClient} from "@/lib/reviews";
import {https} from "@/lib/seo-schema";
import {sponsorVisitor,sponsorCookie,recordSponsorEvent} from "@/lib/sponsor-events";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const c=publicReviewClient();if(!c||!/^[0-9a-f-]{36}$/i.test(id))return new NextResponse('Sponsor tidak tersedia.',{status:404});const {data}=await c.from('sponsor_feed').select('id,link_url,placement').eq('id',id).maybeSingle();if(!data||!https(data.link_url))return new NextResponse('Sponsor tidak tersedia.',{status:404});const visitor=sponsorVisitor(request);try{await recordSponsorEvent(id,visitor,'click',data.placement);}catch{/* The destination remains available if counting fails. */}return sponsorCookie(NextResponse.redirect(data.link_url,{status:302,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}}),visitor);}
