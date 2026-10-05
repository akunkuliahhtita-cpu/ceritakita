export type MediaItem={id:string;url:string;path:string;name:string;alt:string;size:number;mime:string;created_at:string;deleting:boolean};
export type AdminPlan={id:string;name:string;slug:string;price_idr:number;period:"free"|"monthly"|"yearly";features:string[];is_highlighted:boolean;is_active:boolean;sort:number};
export type PlanInput=Omit<AdminPlan,"id">&{id?:string};
export type ActionResult={error:string|null};
