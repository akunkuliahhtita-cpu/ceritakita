"use client";
import {useState} from "react";
import type {MediaItem} from "@/lib/admin-types";
import Modal from "./Modal";
import MediaLibrary from "./MediaLibrary";
export default function MediaPicker({label,value,onChange}:{label:string;value:string;onChange:(url:string)=>void}){const [open,setOpen]=useState(false);function choose(item:MediaItem){onChange(item.url);setOpen(false);}return <div><p className="mb-2 text-sm font-medium">{label}</p><div className="flex flex-wrap items-center gap-4">{value?<img src={value} alt={label} width={56} height={56} className="h-14 w-14 rounded-xl border border-[#EADFF2] bg-white object-contain"/>:<span className="grid h-14 w-14 place-items-center rounded-xl bg-lilac text-xs">Kosong</span>}<button type="button" aria-label={`Pilih gambar untuk ${label}`} onClick={()=>setOpen(true)} className="btn btn-ghost text-xs">Pilih / unggah gambar</button></div><Modal open={open} title={`Pilih ${label.toLocaleLowerCase("id-ID")}`} onClose={()=>setOpen(false)}><MediaLibrary onPick={choose}/></Modal></div>;}
