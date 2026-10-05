"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import Script from "next/script";
type AnalyticsWindow=Window&{dataLayer?:unknown[];gtag?:(...args:unknown[])=>void;ckAnalyticsId?:string};
export default function Analytics({id}:{id:string}){const path=usePathname(),enabled=/^G-[A-Z0-9]{4,30}$/.test(id)&&!/^\/(app|admin|auth)(\/|$)/.test(path);useEffect(()=>{if(!enabled)return;const w=window as AnalyticsWindow;w.dataLayer=w.dataLayer??[];w.gtag=w.gtag??function(){w.dataLayer!.push(arguments);};if(w.ckAnalyticsId!==id){w.gtag('js',new Date());w.gtag('config',id,{anonymize_ip:true,send_page_view:false});w.ckAnalyticsId=id;}w.gtag('event','page_view',{page_path:path,send_to:id});},[id,path,enabled]);return enabled?<Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive"/>:null;}
