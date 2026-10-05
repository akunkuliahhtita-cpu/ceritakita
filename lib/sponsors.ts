import "server-only";
import {publicReviewClient} from "./reviews";
import type {Placement,Sponsor} from "./sponsors-schema";
export async function activeSponsors(placement:Placement):Promise<Sponsor[]>{const c=publicReviewClient();if(!c)return [];const {data}=await c.from('sponsor_feed').select('id,name,logo_url,title,description,link_url,placement,start_at,end_at,is_active').eq('placement',placement).limit(12);return (data??[]) as Sponsor[];}
