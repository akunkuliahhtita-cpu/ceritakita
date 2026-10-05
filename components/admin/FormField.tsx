import {cloneElement,isValidElement,type ReactNode} from "react";
export default function FormField({label,htmlFor,hint,error,children}:{label:string;htmlFor:string;hint?:string;error?:string;children:ReactNode}){
 const field=isValidElement<{id?:string;"aria-describedby"?:string;"aria-invalid"?:boolean}>(children)?cloneElement(children,{id:htmlFor,"aria-describedby":[children.props["aria-describedby"],hint?`${htmlFor}-hint`:null,error?`${htmlFor}-error`:null].filter(Boolean).join(" ")||undefined,"aria-invalid":error?true:undefined}):children;
 return <div className="space-y-2"><label htmlFor={htmlFor} className="block text-sm font-medium">{label}</label>{field}{hint&&<p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-muted">{hint}</p>}{error&&<p id={`${htmlFor}-error`} role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
