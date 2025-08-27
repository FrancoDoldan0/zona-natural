"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCsrfTokenFromCookie } from "@/components/admin/csrf";

type Img = { id:number; url:string; alt:string|null; sortOrder:number };

export default function ProductImagesPage({ params }:{ params:{ id:string } }){
  const pid = Number(params.id);
  const [items, setItems] = useState<Img[]>([]);
  const [file, setFile] = useState<File|null>(null);
  const [alt, setAlt] = useState("");
  const [msg, setMsg] = useState("");

  async function load(){
    const r = await fetch(`/api/admin/products/${pid}/images`, { cache:"no-store" });
    const j = await r.json();
    if (j.ok) setItems(j.items);
  }
  useEffect(()=>{ load(); },[]);

  async function upload(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    if (!file) { setMsg("Elegí una imagen"); return; }
    const fd = new FormData();
    fd.set("file", file);
    if (alt) fd.set("alt", alt);
    const r = await fetch(`/api/admin/products/${pid}/images`, {
      method: "POST",
      headers: { "x-csrf-token": getCsrfTokenFromCookie() },
      body: fd
    });
    const j = await r.json();
    if (j.ok){ setFile(null); setAlt(""); (document.getElementById("imgfile") as HTMLInputElement).value=""; await load(); }
    else setMsg(j.error || "Error al subir");
  }

  async function setAltOf(id:number, value:string){
    await fetch(`/api/admin/products/${pid}/images/${id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json; charset=utf-8", "x-csrf-token": getCsrfTokenFromCookie() },
      body: JSON.stringify({ alt: value })
    });
    await load();
  }

  async function move(id:number, dir:"up"|"down"){
    await fetch(`/api/admin/products/${pid}/images/${id}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json; charset=utf-8", "x-csrf-token": getCsrfTokenFromCookie() },
      body: JSON.stringify({ move: dir })
    });
    await load();
  }

  async function del(id:number){
    if (!confirm("¿Eliminar imagen?")) return;
    await fetch(`/api/admin/products/${pid}/images/${id}`, {
      method:"DELETE",
      headers:{ "x-csrf-token": getCsrfTokenFromCookie() }
    });
    await load();
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/admin/productos/${pid}`} className="underline">← Volver</Link>
        <h1 className="text-xl font-semibold">Imágenes del producto #{pid}</h1>
      </div>

      <form onSubmit={upload} className="border rounded p-4 grid md:grid-cols-4 gap-2">
        <input id="imgfile" type="file" accept="image/*" className="md:col-span-2"
               onChange={e=> setFile(e.target.files?.[0] || null)} />
        <input className="border rounded p-2" placeholder="Texto ALT (opcional)" value={alt} onChange={e=>setAlt(e.target.value)} />
        <button className="border rounded px-4 py-2">Subir</button>
        {msg && <div className="text-sm text-red-600 md:col-span-4">{msg}</div>}
        <div className="text-xs text-gray-500 md:col-span-4">Formatos: JPG/PNG/WebP/GIF/AVIF. Máx 6MB.</div>
      </form>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((im, i)=>(
          <div key={im.id} className="border rounded p-2 space-y-2">
            <img src={im.url} alt={im.alt || ""} className="w-full h-40 object-cover rounded" />
            <input className="border rounded p-2 w-full text-sm"
                   value={im.alt || ""} placeholder="ALT…"
                   onChange={e=>{
                     const v = e.target.value;
                     setItems(prev => prev.map(x => x.id===im.id ? { ...x, alt:v } : x));
                   }}
                   onBlur={e=> setAltOf(im.id, e.target.value)} />
            <div className="flex items-center justify-between">
              <div className="space-x-2">
                <button className="border rounded px-2 py-1 text-xs" disabled={i===0} onClick={()=>move(im.id,"up")} type="button">↑</button>
                <button className="border rounded px-2 py-1 text-xs" disabled={i===items.length-1} onClick={()=>move(im.id,"down")} type="button">↓</button>
              </div>
              <button className="border rounded px-2 py-1 text-xs text-red-600" onClick={()=>del(im.id)} type="button">Borrar</button>
            </div>
          </div>
        ))}
        {!items.length && <div className="opacity-70">Sin imágenes todavía.</div>}
      </div>
    </main>
  );
}