"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Row = { id:number; url:string; alt:string|null; sortOrder:number };

export default function ProductImagesPage({ params }:{ params:{ id:string } }){
  const pid = Number(params.id);
  const [items, setItems] = useState<Row[]>([]);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [order, setOrder] = useState("0");

  async function load(){
    const r = await fetch(`/api/admin/products/${pid}/images`, { cache:"no-store" });
    const j = await r.json(); if (j.ok) setItems(j.items);
  }
  useEffect(()=>{ load(); },[]);

  async function add(e:React.FormEvent){
    e.preventDefault();
    const r = await fetch(`/api/admin/products/${pid}/images`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ url, alt: alt || null, sortOrder: Number(order||0) })
    });
    const j = await r.json();
    if (j.ok){ setUrl(""); setAlt(""); setOrder("0"); load(); }
    else alert(j.error || "Error");
  }

  async function save(row: Row, patch: Partial<Row>){
    const r = await fetch(`/api/admin/products/${pid}/images`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ id: row.id, ...patch })
    });
    const j = await r.json();
    if (j.ok) setItems(prev => prev.map(x => x.id===row.id ? j.item : x));
  }

  async function del(row: Row){
    if (!confirm("Eliminar la fila y, si corresponde, borrar el archivo físico?")) return;
    const r = await fetch(`/api/admin/products/${pid}/images?id=${row.id}&removeFile=1`, { method:"DELETE" });
    const j = await r.json();
    if (j.ok) setItems(prev => prev.filter(x => x.id!==row.id));
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <Link className="border rounded px-3 py-1 inline-block" href="/admin/productos">{'\u2190'} Volver</Link>
      <h1 className="text-xl font-semibold">Imágenes del producto #{pid}</h1>

      <p className="opacity-70 text-sm">Primero subí la imagen en <a className="underline" href="/admin/uploads" target="_blank">/admin/uploads</a> y pegá la URL.</p>

      <form onSubmit={add} className="grid gap-2 md:grid-cols-6">
        <input className="border rounded p-2 md:col-span-3" placeholder="URL (/uploads/...)" value={url} onChange={e=>setUrl(e.target.value)} />
        <input className="border rounded p-2 md:col-span-2" placeholder="Alt (opcional)" value={alt} onChange={e=>setAlt(e.target.value)} />
        <input className="border rounded p-2" type="number" min={0} value={order} onChange={e=>setOrder(e.target.value)} />
        <button className="border rounded px-4 md:col-span-6 md:justify-self-start" type="submit">Agregar</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded">
          <thead><tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Preview</th>
            <th className="p-2 border">URL</th>
            <th className="p-2 border">Alt</th>
            <th className="p-2 border">Orden</th>
            <th className="p-2 border">Acciones</th>
          </tr></thead>
          <tbody>
            {items.map(row=>(
              <tr key={row.id}>
                <td className="p-2 border">{row.id}</td>
                <td className="p-2 border"><img src={row.url} alt={row.alt ?? ""} className="h-28 w-44 object-cover" /></td>
                <td className="p-2 border">{row.url}</td>
                <td className="p-2 border">
                  <input className="border rounded p-1 w-48" defaultValue={row.alt ?? ""} onBlur={(e)=>save(row,{alt: e.target.value})}/>
                </td>
                <td className="p-2 border">
                  <input className="border rounded p-1 w-16" type="number" defaultValue={String(row.sortOrder)} onBlur={(e)=>save(row,{sortOrder: Number(e.target.value||0)})}/>
                </td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>del(row)}>Eliminar (archivo)</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 opacity-70" colSpan={6}>Sin imágenes</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}