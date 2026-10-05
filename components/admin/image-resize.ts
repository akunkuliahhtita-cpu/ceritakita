export async function resizeImage(file:File,maxEdge=1600):Promise<File>{
 if(file.size===0||file.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Gunakan JPG, PNG, atau WebP maksimal 5 MB.");
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error("Gambar tidak dapat dibaca. Pilih gambar lain, ya.");}try{
 const ratio=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const context=canvas.getContext("2d");if(!context)throw new Error("Gambar belum bisa diproses.");context.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const output=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Gambar belum bisa diproses.")),"image/webp",.86));
 if(output.size>5*1024*1024)throw new Error("Hasil gambar masih lebih dari 5 MB.");return new File([output],file.name,{type:output.type});
 }finally{bitmap.close();}
}
