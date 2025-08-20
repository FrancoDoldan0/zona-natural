"use client";
import { useEffect, useMemo, useState } from "react";

type Category = { id:number; name:string };
type Product  = { id:number; name:string };
type Offer = {
  id:number; title:string; description:string|null;
  discountType:"PERCENT"|"AMOUNT"; discountVal:number;
  startAt:string|null; endAt:string|null;
  product?: Product|null; category?: Category|null;
};

export default function OfertasPage(){
  const [cats,setCats] = useState<Category[]>([]);
  const [prods,setProds] = useState<Product[]>([]);
  const [items,setItems] = useState<Offer[]>([]);
  const [q,setQ] = useState("");

  // Form crear
  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [discountType,setDiscountType] = useState<"PERCENT"|"AMOUNT">("PERCENT");
  const [discountVal,setDiscountVal] = useState<string>("10");
  const [startAt,setStartAt] = useState(""); // datetime-local
  const [endAt,setEndAt] = useState("");
  const [dest,setDest] = useState<"none"|"product"|"category">("none");
  const [productId,setProductId] = useState<number| "">("");
  const [categoryId,setCategoryId] = useState<number| "">("");

  async function loadRefs(){
    const [c,p] = await Promise.all([
      fetch("/api/admin/categories?take=999").then(r=>r.json()),
      fetch("/api/admin/products?take=999").then(r=>r.json()),
    ]);
    if (c.ok) setCats(c.items);
    if (p.ok) setProds(p.items);
  }
  async function load(){
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const res = await fetch("/api/admin/offers?"+sp.toString(), { cache:"no-store" });
    const data = await res.json(); if (data.ok) setItems(data.items);
  }
  useEffect(()=>{ loadRefs(); load(); },[]);

  async function onCreate(e:React.FormEvent){
    e.preventDefault();
    const body:any = {
      title,
      discountType,
      discountVal: Number(discountVal || 0),
    };
    if (description.trim()) body.description = description.trim();
    if (startAt) body.startAt = new Date(startAt).toISOString();
    if (endAt) body.endAt = new Date(endAt).toISOString();
    if (dest === "product" && productId !== "") body.productId = Number(productId);
    if (dest === "category" && categoryId !== "") body.categoryId = Number(categoryId);

    const res = await fetch("/api/admin/offers", {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.ok){
      setTitle(""); setDescription(""); setDiscountType("PERCENT"); setDiscountVal("10");
      setStartAt(""); setEndAt(""); setDest("none"); setProductId(""); setCategoryId("");
      await load();
    } else {
      alert(data.error || "Error");
    }
  }

  async function onDelete(id:number){
    if (!confirm("¿Eliminar oferta?")) return;
    const res = await fetch(`/api/admin/offers/${id}`, { method:"DELETE" });
    const data = await res.json();
    if (data.ok) setItems(prev => prev.filter(x => x.id !== id));
  }

  function fmtDate(s:string|null){ if(!s) return "-"; const d=new Date(s); return d.toLocaleDateString()+" "+d.toLocaleTimeString(); }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ofertas</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input className="border rounded p-2 md:col-span-2" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} />
          <select className="border rounded p-2" value={discountType} onChange={e=>setDiscountType(e.target.value as any)}>
            <option value="PERCENT">% (porcentaje)</option>
            <option value="AMOUNT">$ (monto fijo)</option>
          </select>
          <input className="border rounded p-2" placeholder={discountType==="PERCENT"?"%":"$"} value={discountVal} onChange={e=>setDiscountVal(e.target.value)} />
          <input className="border rounded p-2" type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} />
          <input className="border rounded p-2" type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)} />
        </div>

        <textarea className="border rounded p-2 w-full" rows={3} placeholder="Descripción (opcional)" value={description} onChange={e=>setDescription(e.target.value)} />

        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded p-2" value={dest} onChange={e=>{ const v=e.target.value as any; setDest(v); setProductId(""); setCategoryId(""); }}>
            <option value="none">Sin destino específico</option>
            <option value="product">Aplica a producto</option>
            <option value="category">Aplica a categoría</option>
          </select>
          {dest==="product" && (
            <select className="border rounded p-2" value={productId} onChange={e=>setProductId(e.target.value===""? "": Number(e.target.value))}>
              <option value="">Elegir producto…</option>
              {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {dest==="category" && (
            <select className="border rounded p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value===""? "": Number(e.target.value))}>
              <option value="">Elegir categoría…</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <button className="border rounded px-4" type="submit">Crear</button>
      </form>

      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="border rounded px-3" onClick={load}>Filtrar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border rounded text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Valor</th>
              <th className="p-2 border">Desde</th>
              <th className="p-2 border">Hasta</th>
              <th className="p-2 border">Destino</th>
              <th className="p-2 border">Descripción</th>
              <th className="p-2 border w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(o=>(
              <tr key={o.id}>
                <td className="p-2 border">{o.id}</td>
                <td className="p-2 border">{o.title}</td>
                <td className="p-2 border">{o.discountType}</td>
                <td className="p-2 border">{o.discountVal}</td>
                <td className="p-2 border">{fmtDate(o.startAt ?? null)}</td>
                <td className="p-2 border">{fmtDate(o.endAt ?? null)}</td>
                <td className="p-2 border">
                  {o.product ? `Producto: ${o.product.name}` :
                   o.category ? `Categoría: ${o.category.name}` : "-"}
                </td>
                <td className="p-2 border max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">{o.description ?? "-"}</td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>onDelete(o.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 opacity-70" colSpan={9}>Sin ofertas</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="text-xs opacity-60">Nota: fechas en horario local de tu navegador.</p>
    </main>
  );
}