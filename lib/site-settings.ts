import {cache} from "react";
import {publicReviewClient} from "./reviews";
import {parseSiteSettings} from "./site-settings-schema";
export const readSiteSettings=cache(async()=>{
 const client=publicReviewClient();if(!client)return parseSiteSettings(null,null);
 try{const {data,error}=await client.from("site_settings").select("key,value").in("key",["public_settings","crisis_help"]);if(error)return parseSiteSettings(null,null);return parseSiteSettings(data?.find(row=>row.key==="public_settings")?.value,data?.find(row=>row.key==="crisis_help")?.value);}catch{return parseSiteSettings(null,null);}
});
