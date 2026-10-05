import {WA_NUMBER} from "./site";
export type EmergencyContact={label:string;phone:string;url:string};
export type SiteSettings={name:string;logoUrl:string;faviconUrl:string;whatsappNumber:string;whatsappGreeting:string;contactEmail:string;socials:{label:string;url:string}[];stats:{users:number|null;stories:number|null;articles:number|null};chips:string[];footerText:string;emergencyText:string;emergencyContacts:EmergencyContact[]};
export const DEFAULT_SITE_SETTINGS:SiteSettings={name:"CeritaKita",logoUrl:"/logo-mark.png",faviconUrl:"/icon.png",whatsappNumber:WA_NUMBER,whatsappGreeting:"Halo CeritaKita, saya butuh bantuan.",contactEmail:"",socials:[],stats:{users:null,stories:null,articles:null},chips:["Tenang","Berani Bercerita","Kenali Diri","Tumbuh","Didengar","Pulih","Bersyukur","Aman","Pelan-pelan","Sayangi Diri","Bersama"],footerText:"Bukan pengganti layanan profesional/darurat.",emergencyText:"Jika kamu dalam keadaan darurat atau berpikir menyakiti diri, segera hubungi layanan darurat atau orang terdekat. CeritaKita bukan pengganti tenaga profesional.",emergencyContacts:[]};
export function httpsUrl(value:unknown):value is string{if(typeof value!=="string"||value.length>2048)return false;try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}}
export function helpUrl(value:unknown):value is string{return httpsUrl(value)||(typeof value==="string"&&/^tel:\+?[0-9]{3,15}$/.test(value));}
export function validateSiteSettings(input:SiteSettings):string|null{
 if(!input||typeof input!=="object")return "Pengaturan tidak valid.";
 const strings:{key:keyof SiteSettings;max:number;required?:boolean}[]=[{key:"name",max:80,required:true},{key:"whatsappGreeting",max:1000,required:true},{key:"contactEmail",max:254},{key:"footerText",max:1000},{key:"emergencyText",max:1500,required:true}];
 for(const field of strings){const value=input[field.key];if(typeof value!=="string"||value.length>field.max||(field.required&&!value.trim()))return "Isi teks pengaturan dengan panjang yang valid.";}
 if(!(input.logoUrl==="/logo-mark.png"||httpsUrl(input.logoUrl))||!(input.faviconUrl==="/icon.png"||httpsUrl(input.faviconUrl)))return "Pilih logo dan favicon dari Media Library.";
 if(typeof input.whatsappNumber!=="string"||!/^[+0-9 ()-]+$/.test(input.whatsappNumber)||!/^\d{8,15}$/.test(input.whatsappNumber.replace(/\D/g,"")))return "Nomor WhatsApp harus berisi 8–15 digit, termasuk kode negara.";
 if(input.contactEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail))return "Email kontak belum valid.";
 if(!input.stats||typeof input.stats!=="object"||[input.stats.users,input.stats.stories,input.stats.articles].some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0||v>1000000000)))return "Statistik harus kosong atau angka bulat 0–1.000.000.000.";
 if(!Array.isArray(input.chips)||input.chips.length>50||input.chips.some(v=>typeof v!=="string"||!v.trim()||v.length>60))return "Isi maksimal 50 chip, masing-masing 1–60 karakter.";
 if(!Array.isArray(input.socials)||input.socials.length>12||input.socials.some(v=>!v||typeof v.label!=="string"||!v.label.trim()||v.label.length>50||!httpsUrl(v.url)))return "Isi nama sosmed dan link HTTPS yang valid.";
 if(!Array.isArray(input.emergencyContacts)||input.emergencyContacts.length>10||input.emergencyContacts.some(v=>!v||typeof v.label!=="string"||!v.label.trim()||v.label.length>80||typeof v.phone!=="string"||v.phone.length>40||!helpUrl(v.url)))return "Isi nama kontak bantuan dan tautan HTTPS atau tel: yang valid.";
 return null;
}
export function parseSiteSettings(value:unknown,crisis:unknown):SiteSettings{
 const fallback={...DEFAULT_SITE_SETTINGS,stats:{...DEFAULT_SITE_SETTINGS.stats},chips:[...DEFAULT_SITE_SETTINGS.chips],socials:[],emergencyContacts:[] as EmergencyContact[]};
 if(crisis&&typeof crisis==="object"&&"label" in crisis&&"url" in crisis&&"phone" in crisis&&typeof crisis.label==="string"&&typeof crisis.phone==="string"&&helpUrl(crisis.url)){fallback.emergencyContacts=[{label:crisis.label,phone:crisis.phone,url:crisis.url}];if("emergency" in crisis&&typeof crisis.emergency==="string")fallback.emergencyText=crisis.emergency;}
 if(!value||typeof value!=="object"||Array.isArray(value))return fallback;
 const candidate={...fallback,...value} as SiteSettings;
 return validateSiteSettings(candidate)?fallback:candidate;
}
export function settingWaLink(settings:Pick<SiteSettings,"whatsappNumber"|"whatsappGreeting">,message?:string){return `https://wa.me/${settings.whatsappNumber.replace(/\D/g,"")}?text=${encodeURIComponent(message??settings.whatsappGreeting)}`;}
