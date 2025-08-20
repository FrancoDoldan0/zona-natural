"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Img = { id:number; productId:number; url:string; alt:string|null; sortOrder:number };

export default function ProductImagesPage(){
  const params = useParams<{ id:string }>();
  const router = useRouter();
  const pid = Number(params.id);
  const [items,setItems] = useState<Img[]>([]);
  const [url,setUrl] = useState("");
  const [alt,setAlt] = useState("");
  const [sortOrder,setSortOrder] = useState("0");
  const [loading,setLoading] = useState(false);

  async function load(){
    const r = await fetch(`/api/admin/products/${pid}/images`, { cache:"no-store" });
    const j = await r.json(); if (j.ok) setItems(j.items);
  }
  useEffect(()=>{ if(pid) load(); },[pid]);

  async function onCreate(e:React.FormEvent){
    e.preventDefault();
    if(!url.trim()) return;
    setLoading(true);
    const r = await fetch(`/api/admin/products/${pid}/images`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ url: url.trim(), alt: alt.trim() || null, sortOrder: Number(sortOrder||0) })
    });
    setLoading(false);
    const j = await r.json();
    if(j.ok){ setUrl(""); setAlt(""); setSortOrder("0"); load(); }
    else alert(j.error || "Error");
  }

  async function onDelete(id:number){
    if(!confirm("¿Eliminar imagen?")) return;
    const r = await fetch(`/api/admin/products/${pid}/images/${id}`, { method:"DELETE" });
    const j = await r.json(); if (j.ok) setItems(prev=>prev.filter(x=>x.id!==id));
  }

  async function update(id:number, patch: Partial<Img>){
    const r = await fetch(`/api/admin/products/${pid}/images/${id}`, {
      method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(patch)
    });
    const j = await r.json(); if (j.ok) setItems(prev=>prev.map(x=>x.id===id? j.item : x));
  }

  async function move(id:number, dir:-1|1){
    const current = items.find(i=>i.id===id); if(!current) return;
    const newOrder = Math.max(0, current.sortOrder + dir);
    await update(id,{ sortOrder:newOrder });
    load();
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button className="border px-3 py-1 rounded" onClick={()=>router.push("/admin/productos")}>← Volver</button>
        <h1 className="text-2xl font-semibold">Imágenes del producto #{pid}</h1>
      </div>

      <p className="text-sm opacity-75">
        Primero subí la imagen en <a className="underline" href="/admin/uploads" target="_blank">/admin/uploads</a> y pegá la URL.
      </p>

      <form onSubmit={onCreate} className="border rounded p-4 grid md:grid-cols-6 gap-2">
        <input className="border rounded p-2 md:col-span-3" placeholder="URL (/uploads/...)" value={url} onChange={e=>setUrl(e.target.value)} />
        <input className="border rounded p-2 md:col-span-2" placeholder="Alt (opcional)" value={alt} onChange={e=>setAlt(e.target.value)} />
        <input className="border rounded p-2" type="number" min={0} value={sortOrder} onChange={e=>setSortOrder(e.target.value)} />
        <button className="border rounded px-4 md:col-span-6" disabled={loading} type="submit">{loading? "Guardando..." : "Agregar"}</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Preview</th>
              <th className="p-2 border">URL</th>
              <th className="p-2 border">Alt</th>
              <th className="p-2 border">Orden</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.sort((a,b)=>a.sortOrder-b.sortOrder || a.id-b.id).map(img=>(
              <tr key={img.id}>
                <td className="p-2 border">{img.id}</td>
                <td className="p-2 border"><img src={img.url} alt={img.alt || ""} className="h-14 w-24 object-cover" /></td>
                <td className="p-2 border">{img.url}</td>
                <td className="p-2 border">
                  <input className="border rounded px-1 py-0.5 w-40" defaultValue={img.alt ?? ""} onBlur={e=>update(img.id,{ alt: e.target.value || null })}/>
                </td>
                <td className="p-2 border">
                  <div className="flex items-center gap-1">
                    <button className="border rounded px-2" onClick={()=>move(img.id,-1)}>↑</button>
                    <button className="border rounded px-2" onClick={()=>move(img.id, 1)}>↓</button>
                    <input className="border rounded px-1 py-0.5 w-16 text-center"
                      defaultValue={String(img.sortOrder)}
                      onBlur={e=>update(img.id,{ sortOrder: Number(e.target.value||0) })}/>
                  </div>
                </td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>onDelete(img.id)}>Eliminar</button>
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