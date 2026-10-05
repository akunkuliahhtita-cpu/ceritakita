import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {NextResponse,type NextRequest} from "next/server";
import {publicReviewClient} from "./reviews";
export function sponsorVisitor(request:NextRequest,fallback?:unknown){const stored=request.cookies.get('ck_sponsor_visitor')?.value;return stored&&/^[0-9a-f-]{36}$/i.test(stored)?stored:typeof fallback==='string'&&/^[0-9a-f-]{36}$/i.test(fallback)?fallback:randomUUID();}
export function sponsorCookie(response:NextResponse,visitor:string){response.cookies.set('ck_sponsor_visitor',visitor,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400,path:'/'});return response;}
export async function recordSponsorEvent(id:string,visitor:string,type:'click'|'impression',placement:string){const client=publicReviewClient();if(!client)return;await client.rpc('record_sponsor_event',{sponsor_uuid:id,visitor_hash_value:createHash('sha256').update(visitor).digest('hex'),event_type:type,event_placement:placement});}
