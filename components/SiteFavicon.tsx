"use client";
import {useEffect} from "react";
// File-based Next.js icons otherwise take precedence over configured metadata icons.
export default function SiteFavicon({url}:{url:string}){useEffect(()=>{
 function apply(){const icons=document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="shortcut icon"]');icons.forEach(icon=>{if(icon.getAttribute("href")!==url)icon.setAttribute("href",url);icon.removeAttribute("sizes");icon.removeAttribute("type");});}
 apply();const observer=new MutationObserver(apply);observer.observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:["href","rel"]});return()=>observer.disconnect();
 },[url]);return null;}
