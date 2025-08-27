"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCsrfTokenFromCookie } from "@/components/admin/csrf";

type Cat = { id:number; name:string; subcats:{ id:number; name:string }[] }
type Prod = {
  id:number; name:string; slug:string; status:"ACTIVE"|"INACTIVE";
  price:number|null; sku:string|null;
  category?: { id:number; name:string }|null;
  subcategory?: { id:number; name:string }|null;
  images?: { id:number; url:string; sortOrder:number }[];
}

export default function ProductsAdminPage(){
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Prod[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<""|"ACTIVE"|"INACTIVE">("");
  const [categoryId, setCategoryId] = useState<number|"" >("");
  const [subcategoryId, setSubcategoryId] = useState<number|"" >("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // form crear
  const [f,setF] = useState({
    name:"", slug:"", description:"", price:"", sku:"", status:"ACTIVE" as const,
    categoryId:"" as number|"",
    subcategoryId:"" as number|"",
  });
  const subcats = useMemo(
    ()=> cats.find(c=>c.id===Number(categoryId))?.subcats || [],
    [cats, categoryId]
  );

  async function loadCats(){
    const r = await fetch("/api/public/categories", { cache:"no-store" });
    const j = await r.json();
    setCats((j.items||[]).map((c:any)=>({ id:c.id, name:c.name, subcats:(c.subcats||[]).map((s:any)=>({id:s.id,name:s.name})) })));
  }

  async function load(){
    const p = new URLSearchParams();
    if(q) p.set("q", q);
    if(status) p.set("status", status);
    if(categoryId!=="") p.set("categoryId", String(categoryId));
    if(subcategoryId!=="") p.set("subcategoryId", String(subcategoryId));
    if(minPrice) p.set("minPrice", minPrice);
    if(maxPrice) p.set("maxPrice", maxPrice);
    p.set("page", String(page)); p.set("perPage", String(perPage));
    const r = await fetch(`/api/admin/products?${p.toString()}`, { cache:"no-store" });
    const j = await r.json();
    if (j.ok){ setItems(j.items); setTotal(j.total); }
  }

  useEffect(()=>{ loadCats(); },[]);
  useEffect(()=>{ load(); /*eslint-disable-next-line*/ },[page,perPage]); // carga inicial
  function applyFilters(e:React.FormEvent){ e.preventDefault(); setPage(1); load(); }

  async function create(e:React.FormEvent){
    e.preventDefault();
    const body:any = {
      name:f.name, slug:f.slug||undefined,
      description: f.description||null,
      price: f.price? Number(f.price): null,
      sku: f.sku||null, status: f.status,
      categoryId: f.categoryId===""? null : Number(f.categoryId),
      subcategoryId: f.subcategoryId===""? null : Number(f.subcategoryId),
    };
    const r = await fetch("/api/admin/products", {
      method:"POST",
      headers: { "Content-Type":"application/json", "x-csrf-token": getCsrfTokenFromCookie() },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (j.ok){ setF({name:"",slug:"",description:"",price:"",sku:"",status:"ACTIVE",categoryId:"",subcategoryId:""}); load(); }
    else alert(j.error || "Error al crear");
  }

  const pages = Math.max(1, Math.ceil(total/perPage));

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Link href="/admin" className="text-sm underline">Volver al panel</Link>
      </div>

      {/* filtros */}
      <form onSubmit={applyFilters} className="grid md:grid-cols-6 gap-2 border rounded p-3">
        <input className="border rounded p-2" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded p-2" value={status} onChange={e=>setStatus(e.target.value as any)}>
          <option value="">Estado (todos)</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
        <select className="border rounded p-2" value={categoryId} onChange={e=>{setCategoryId(e.target.value===""?"":Number(e.target.value)); setSubcategoryId("");}}>
          <option value="">Categoría</option>
          {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded p-2" value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value===""?"":Number(e.target.value))}>
          <option value="">Subcategoría</option>
          {subcats.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="border rounded p-2" placeholder="Precio min" value={minPrice} onChange={e=>setMinPrice(e.target.value)} />
        <input className="border rounded p-2" placeholder="Precio max" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
        <button className="border rounded px-4 py-2 md:col-span-6">Aplicar</button>
      </form>

      {/* alta */}
      <form onSubmit={create} className="grid md:grid-cols-6 gap-2 border rounded p-3">
        <input className="border rounded p-2 md:col-span-2" placeholder="Nombre" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required />
        <input className="border rounded p-2 md:col-span-2" placeholder="Slug (opcional)" value={f.slug} onChange={e=>setF({...f,slug:e.target.value})} />
        <input className="border rounded p-2" placeholder="SKU" value={f.sku} onChange={e=>setF({...f,sku:e.target.value})} />
        <input className="border rounded p-2" type="number" step="0.01" placeholder="Precio" value={f.price} onChange={e=>setF({...f,price:e.target.value})} />
        <select className="border rounded p-2" value={f.status} onChange={e=>setF({...f,status:e.target.value as any})}>
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
        <textarea className="border rounded p-2 md:col-span-6" placeholder="Descripción (opcional)" rows={3} value={f.description} onChange={e=>setF({...f,description:e.target.value})}/>
        <button className="border rounded px-4 py-2 md:col-span-6">Crear</button>
      </form>

      {/* tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded">
          <thead><tr className="bg-gray-50">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">Precio</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Categoría</th>
            <th className="p-2 border">Acciones</th>
          </tr></thead>
          <tbody>
            {items.map(p=>(
              <tr key={p.id}>
                <td className="p-2 border">{p.id}</td>
                <td className="p-2 border">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs opacity-70">{p.slug} {p.sku?`• ${p.sku}`:""}</div>
                </td>
                <td className="p-2 border">{p.price??"-"}</td>
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border">{p.category?.name || "-"}</td>
                <td className="p-2 border space-x-2">
                  <Link className="underline" href={`/admin/productos/${p.id}`}>Editar</Link>
                  <Link className="underline" href={`/admin/productos/${p.id}/imagenes`}>Imágenes</Link>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 opacity-70" colSpan={6}>Sin productos</td></tr>}
          </tbody>
        </table>
      </div>

      {/* paginación */}
      {pages>1 && (
        <nav className="flex gap-2">
          <button className="border rounded px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
          <span className="px-2">Página {page}/{pages}</span>
          <button className="border rounded px-3" disabled={page>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>›</button>
          <select className="border rounded p-1 ml-auto" value={perPage} onChange={e=>{setPerPage(Number(e.target.value)); setPage(1);}}>
            {[12,24,48,60].map(n=> <option key={n} value={n}>{n}/pág</option>)}
          </select>
        </nav>
      )}
    </main>
  );
}