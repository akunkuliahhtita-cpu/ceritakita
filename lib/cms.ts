import {sanitizeEducationHtml,youtubeId} from "./education";
export const blockTypes=["hero","features","gallery","video","text","pricing","testimonials","chips","cta","faq","sponsor"] as const;
export type BlockType=typeof blockTypes[number];
export const blockLabels:Record<BlockType,string>={hero:"Hero",features:"Fitur",gallery:"Galeri",video:"Video YouTube",text:"Teks",pricing:"Harga",testimonials:"Testimoni",chips:"Chip gerakan",cta:"CTA",faq:"FAQ",sponsor:"Sponsor"};
export type BlockItem={title:string;text:string;imageUrl:string;imageAlt:string;href:string;label:string;symbol:string};
export type PageBlock={id:string;type:BlockType;title:string;eyebrow:string;text:string;buttonText:string;buttonHref:string;imageUrl:string;imageAlt:string;secondaryImageUrl:string;visualLabel:string;aboutTitle:string;aboutText:string;aboutLabel:string;aboutButtonText:string;aboutButtonHref:string;youtubeUrl:string;html:string;items:BlockItem[];useSiteChips:boolean};
export type CmsPage={id:string;slug:string;title:string;status:"draft"|"published";blocks:PageBlock[];has_draft:boolean;updated_at:string};
export type CmsPlan={id:string;name:string;price_idr:number;period:string;features:string[];is_highlighted:boolean};
export type CmsReview={name:string;text:string;tag:string;rating:number};
export function blankItem():BlockItem{return {title:"",text:"",imageUrl:"",imageAlt:"",href:"",label:"",symbol:""};}
export function blankBlock(type:BlockType,id:string):PageBlock{return {id,type,title:"",eyebrow:"",text:"",buttonText:"",buttonHref:"/masuk",imageUrl:"",imageAlt:"",secondaryImageUrl:"",visualLabel:"",aboutTitle:"",aboutText:"",aboutLabel:"",aboutButtonText:"",aboutButtonHref:"#fitur",youtubeUrl:"",html:"",items:[],useSiteChips:false};}
export function cmsLink(value:string){if(!value)return true;if(/^#[a-zA-Z0-9_-]+$/.test(value))return true;if(value.startsWith("/")&&!value.startsWith("//")&&!/[\\\u0000-\u0020]/.test(value)){try{const url=new URL(value,"https://ceritakita.invalid");return url.origin==="https://ceritakita.invalid";}catch{return false;}}try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password;}catch{return false;}}
export function cmsImage(value:string){return !value||(/^\/[a-zA-Z0-9_./-]+$/.test(value)&&!value.startsWith("//")&&!value.split("/").includes(".."))||(/^https:\/\//.test(value)&&cmsLink(value));}
export function normalizeBlocks(value:unknown):PageBlock[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((raw,index)=>{if(!raw||typeof raw!=="object"||!blockTypes.includes(raw.type))return [];const base=blankBlock(raw.type,typeof raw.id==="string"?raw.id:`block-${index}`);for(const key of Object.keys(base) as (keyof PageBlock)[]){if(typeof base[key]==="string"&&typeof raw[key]==="string")Object.assign(base,{[key]:raw[key]});}base.html=sanitizeEducationHtml(base.html);base.useSiteChips=raw.useSiteChips===true;base.items=Array.isArray(raw.items)?raw.items.filter((i:unknown)=>i&&typeof i==="object").map((i:Record<string,unknown>)=>{const item=blankItem();for(const k of Object.keys(item) as (keyof BlockItem)[])if(typeof i[k]==="string")item[k]=String(i[k]);if(!cmsLink(item.href))item.href="";if(!cmsImage(item.imageUrl))item.imageUrl="";return item;}):[];for(const k of ["buttonHref","aboutButtonHref"] as const)if(!cmsLink(base[k]))base[k]="";for(const k of ["imageUrl","secondaryImageUrl"] as const)if(!cmsImage(base[k]))base[k]="";return [base];});
}
export function validateCms(title:string,slug:string,blocks:unknown){
 if(typeof title!=="string"||!title.trim()||title.length>200)return "Isi judul halaman, maksimal 200 karakter.";
 if(typeof slug!=="string"||(slug!=="/"&&(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||slug.length>180||['admin','app','auth','masuk','kontak','review','api','ditangguhkan','_next'].includes(slug))))return "Slug hanya huruf kecil, angka, dan tanda hubung; hindari alamat sistem.";
 if(!Array.isArray(blocks)||blocks.length>40||JSON.stringify(blocks).length>200000)return "Maksimal 40 blok dan 200 KB konten.";
 const ids=new Set<string>();
 for(const b of blocks){if(!b||typeof b!=="object"||!blockTypes.includes(b.type)||typeof b.id!=="string"||!b.id||b.id.length>80||ids.has(b.id))return "Jenis atau ID blok tidak valid.";ids.add(b.id);
 for(const [k,v] of Object.entries(b)){if(k==="items"||k==="useSiteChips")continue;if(typeof v!=="string"||v.length>(k==="html"?100000:5000))return "Teks blok terlalu panjang atau tidak valid.";}
 if(typeof b.useSiteChips!=="boolean"||!cmsLink(b.buttonHref)||!cmsLink(b.aboutButtonHref)||!cmsImage(b.imageUrl)||!cmsImage(b.secondaryImageUrl))return "Gunakan gambar dan tautan yang valid (HTTPS atau alamat lokal).";
 if(b.type==="video"&&!youtubeId(b.youtubeUrl))return "Isi link YouTube yang valid pada blok video.";
 if(!Array.isArray(b.items)||b.items.length>30)return "Maksimal 30 item per blok.";
 for(const item of b.items){if(!item||typeof item!=="object"||Object.values(item).some(v=>typeof v!=="string"||v.length>5000)||!cmsLink(item.href)||!cmsImage(item.imageUrl))return "Isi item blok dengan teks dan tautan yang valid.";}
 }return null;
}
