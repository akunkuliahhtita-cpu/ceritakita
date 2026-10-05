export type EducationKind = "articles" | "videos";
export type EducationRecord = {
 id:string; title:string; category:string; status:"draft"|"published"|"hidden"; is_premium:boolean;
 published_at:string|null; slug?:string; excerpt?:string; content?:string; cover_url?:string|null;
 youtube_url?:string; youtube_id?:string; description?:string; sort?:number;
};
export function youtubeId(value:string):string|null {
 try { const url=new URL(value.trim()); if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
 let id:string|null=null;
 if(url.hostname==="youtu.be" && /^\/[\w-]{11}\/?$/.test(url.pathname))id=url.pathname.split("/")[1];
 else if(["youtube.com","www.youtube.com","m.youtube.com"].includes(url.hostname)) {
 if(url.pathname==="/watch")id=url.searchParams.get("v");
 else if(/^\/(shorts|embed)\/[\w-]{11}\/?$/.test(url.pathname))id=url.pathname.split("/")[2];
 }return id&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function educationSlug(value:string){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,180).replace(/-$/g,"");}

// A deliberately small HTML grammar: no attributes, links, images or active content.
// Decode entities only inside text, then escape again; encoded markup is never parsed.
const allowed=new Set(["p","br","strong","b","em","i","u","ul","ol","li","h2","h3","blockquote"]);
const blocked=new Set(["script","style","iframe","object","template","svg","math"]);
function textHtml(text:string){
 const named:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:"\u00a0"};
 return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
 if(entity[0]!=="#")return named[entity.toLowerCase()];
 const n=entity[1].toLowerCase()==="x"?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
 return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):"\ufffd";
 }).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
export function sanitizeEducationHtml(source:string){
 let result="",suppressed:string|null=null;
 for(const token of source.match(/<!--[^]*?(?:-->|$)|<[^>]*(?:>|$)|[^<]+|</g)??[]){
 if(token.startsWith("<!--"))continue;
 if(token.startsWith("<")){
 const tag=/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^]*>$/i.exec(token);
 if(!tag){if(!suppressed)result+=textHtml(token);continue;}
 const name=tag[2].toLowerCase();const end=Boolean(tag[1]);
 if(suppressed){if(end&&name===suppressed)suppressed=null;continue;}
 if(blocked.has(name)){if(!end)suppressed=name;continue;}
 if(allowed.has(name)&&!(name==="br"&&end))result+=`<${end?"/":""}${name}>`;
 }else if(!suppressed)result+=textHtml(token);
 }
 return result;
}
export function educationInputError(kind:EducationKind,item:EducationRecord):string|null {
 if(item.id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id))return "ID konten tidak valid.";
 if(!item.title?.trim()||item.title.length>200)return "Isi judul, maksimal 200 karakter.";
 if(!item.category?.trim()||item.category.length>80)return "Isi kategori, maksimal 80 karakter.";
 if(!["draft","published"].includes(item.status)||typeof item.is_premium!=="boolean")return "Pilih status dan akses konten yang valid.";
 if(item.published_at&&!Number.isFinite(Date.parse(item.published_at)))return "Jadwal terbit tidak valid.";
 if(kind==="videos"){
 if((item.youtube_url??"").length>2000||!youtubeId(item.youtube_url??""))return "Gunakan link YouTube watch, youtu.be, shorts, atau embed yang valid.";
 if((item.description??"").length>1000)return "Deskripsi maksimal 1.000 karakter.";
 if(!Number.isInteger(item.sort)||Number(item.sort)<0||Number(item.sort)>100000)return "Urutan harus angka 0–100.000.";
 }else{
 if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug??"")||(item.slug??"").length>180)return "Slug hanya boleh huruf kecil, angka, dan tanda hubung.";
 if((item.excerpt??"").length>1000)return "Ringkasan maksimal 1.000 karakter.";
 if(!item.content?.trim()||item.content.length>100000||!sanitizeEducationHtml(item.content).replace(/<[^>]*>/g,"").trim())return "Isi artikel wajib diisi, maksimal 100.000 karakter.";
 if((item.cover_url??"").length>2000)return "URL sampul terlalu panjang.";
 }return null;
}
