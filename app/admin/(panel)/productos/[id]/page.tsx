"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCsrfTokenFromCookie } from "@/components/admin/csrf";

type Cat = { id:number; name:string; subcats:{ id:number; name:string }[] }

export default function ProductEditPage({ params }:{ params:{ id:string } }){
  const pid = Number(params.id);
  const [cats, setCats] = useState<Cat[]>([]);
  const [f,setF] = useState<any>(null);
  const [msg,setMsg] = useState<string>("");

  const subcats = useMemo(
    ()=> cats.find(c=>c.id===Number(f?.categoryId))?.subcats || [],
    [cats, f?.categoryId]
  );

  async function loadCats(){
    const r = await fetch("/api/public/categories", { cache:"no-store" });
    const j = await r.json();
    setCats((j.items||[]).map((c:any)=>({ id:c.id, name:c.name, subcats:(c.subcats||[]).map((s:any)=>({id:s.id,name:s.name})) })));
  }
  async function load(){
    const r = await fetch(`/api/admin/products/${pid}`, { cache:"no-store" });
    const j = await r.json();
    if (j.ok) {
      const p = j.item;
      setF({
        name: p.name, slug: p.slug, description: p.description||"",
        price: p.price??"", sku: p.sku??"",
        status: p.status,
        categoryId: p.categoryId??"",
        subcategoryId: p.subcategoryId??"",
      });
    }
  }
  useEffect(()=>{ loadCats(); load(); },[]);

  async function save(e:React.FormEvent){
    e.preventDefault();
    setMsg("");
    const body:any = {
      name: f.name,
      slug: f.slug || undefined,
      description: f.description || null,
      price: f.price===""? null : Number(f.price),
      sku: f.sku || null,
      status: f.status,
      categoryId: f.categoryId===""? null : Number(f.categoryId),
      subcategoryId: f.subcategoryId===""? null : Number(f.subcategoryId),
    };
    const r = await fetch(`/api/admin/products/${pid}`, {
      method:"PUT",
      headers: { "Content-Type":"application/json", "x-csrf-token": getCsrfTokenFromCookie() },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.ok) setMsg("Guardado ✔"); else setMsg(j.error || "Error");
  }

  async function del(){
    if (!confirm("¿Eliminar producto? (si tiene imágenes, primero borrarlas)")) return;
    const r = await fetch(`/api/admin/products/${pid}`, {
      method:"DELETE",
      headers: { "x-csrf-token": getCsrfTokenFromCookie() }
    });
    const j = await r.json();
    if (j.ok) window.location.href = "/admin/productos"; else alert(j.error || "Error");
  }

  if (!f) return <main className="max-w-5xl mx-auto p-6">Cargando…</main>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/admin/productos" className="underline">← Volver</Link>
        <div className="flex gap-2">
          <Link className="border rounded px-3 py-1" href={`/admin/productos/${pid}/imagenes`}>Imágenes…</Link>
          <button className="border rounded px-3 py-1 text-red-600" onClick={del}>Eliminar</button>
        </div>
      </div>

      <h1 className="text-xl font-semibold">Editar producto #{pid}</h1>
      {msg && <div className="text-sm">{msg}</div>}

      <form onSubmit={save} className="grid md:grid-cols-6 gap-2 border rounded p-3">
        <input className="border rounded p-2 md:col-span-3" placeholder="Nombre" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required />
        <input className="border rounded p-2 md:col-span-3" placeholder="Slug (opcional)" value={f.slug} onChange={e=>setF({...f,slug:e.target.value})} />
        <textarea className="border rounded p-2 md:col-span-6" placeholder="Descripción" rows={4} value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        <input className="border rounded p-2" type="number" step="0.01" placeholder="Precio" value={f.price} onChange={e=>setF({...f,price:e.target.value})} />
        <input className="border rounded p-2" placeholder="SKU" value={f.sku} onChange={e=>setF({...f,sku:e.target.value})} />
        <select className="border rounded p-2" value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
        <select className="border rounded p-2" value={f.categoryId} onChange={e=>setF({...f,categoryId: (e.target.value===""?"":Number(e.target.value)), subcategoryId:""})}>
          <option value="">Categoría</option>
          {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded p-2" value={f.subcategoryId} onChange={e=>setF({...f,subcategoryId: (e.target.value===""?"":Number(e.target.value))})}>
          <option value="">Subcategoría</option>
          {subcats.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <button className="border rounded px-4 py-2 md:col-span-6">Guardar</button>
      </form>
    </main>
  );
}