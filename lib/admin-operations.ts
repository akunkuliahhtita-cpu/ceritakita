export type UserRole="user"|"editor"|"admin";
export type AdminUser={id:string;email:string;name:string;role:UserRole;premium_until:string|null;created_at:string;suspended_at:string|null;suspension_reason:string|null};
export type UserFilters={search:string;role:string;status:string;premium:string;page:number};
export type UserOperation="role"|"premium_grant"|"premium_revoke"|"suspend"|"activate";
export type UserChange={id:string;operation:UserOperation;role:UserRole;until:string|null;note:string};
export type AuditRow={id:string;created_at:string;admin:string;email:string;action:string;target:string|null};
export type AuditFilters={search:string;action:string;from:string;to:string;page:number};
export type DayMetric={day:string;registrations:number;revenue:number};
export type AdminMetrics={new_users:number;monthly_revenue:number;awaiting_orders:number;open_reports:number;unknown_payment_dates:number;days:DayMetric[]};
export const PAGE_SIZE=20;
export const defaultUserFilters:UserFilters={search:'',role:'',status:'',premium:'',page:1};
export const defaultAuditFilters:AuditFilters={search:'',action:'',from:'',to:'',page:1};
export function uuid(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function validUserFilters(v:UserFilters){return Boolean(v&&typeof v.search==='string'&&v.search.length<=254&&['','user','editor','admin'].includes(v.role)&&['','active','suspended'].includes(v.status)&&['','premium','free'].includes(v.premium)&&Number.isInteger(v.page)&&v.page>=1&&v.page<=100000);}
function date(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
export function validAuditFilters(v:AuditFilters){return Boolean(v&&typeof v.search==='string'&&v.search.length<=254&&typeof v.action==='string'&&v.action.length<=100&&typeof v.from==='string'&&typeof v.to==='string'&&(!v.from||date(v.from))&&(!v.to||date(v.to))&&(!v.from||!v.to||v.from<=v.to)&&Number.isInteger(v.page)&&v.page>=1&&v.page<=100000);}
export function userChangeError(v:UserChange,actor:string,now=Date.now()){if(!v||!uuid(v.id)||!['role','premium_grant','premium_revoke','suspend','activate'].includes(v.operation)||!['user','editor','admin'].includes(v.role)||typeof v.note!=='string'||v.note.length>1000)return "Tindakan pengguna tidak valid.";if(v.id.toLowerCase()===actor.toLowerCase()&&v.operation==='role'&&v.role!=='admin')return "Kamu tidak bisa menurunkan peran adminmu sendiri.";if(v.id.toLowerCase()===actor.toLowerCase()&&v.operation==='suspend')return "Kamu tidak bisa menangguhkan akunmu sendiri.";if(v.operation==='suspend'&&v.note.trim().length<3)return "Isi alasan suspend minimal 3 karakter.";if(v.operation==='premium_grant'&&(typeof v.until!=='string'||!Number.isFinite(Date.parse(v.until))||Date.parse(v.until)<=now))return "Pilih masa aktif premium setelah waktu sekarang.";return null;}
export function dateWib(value:string|null){if(!value)return '—';return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(value))+' WIB';}
export function rupiah(value:number){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);}
