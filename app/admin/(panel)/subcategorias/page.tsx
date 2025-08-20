"use client";
import { useEffect, useMemo, useState } from "react";

type Category = { id: number; name: string; slug: string };
type Subcategory = { id: number; name: string; slug: string; categoryId: number };

export default function SubcategoriasPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Subcategory[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<number | "">("");

  async function loadCats() {
    const res = await fetch("/api/admin/categories?take=999", { cache: "no-store" });
    const data = await res.json(); if (data.ok) setCats(data.items);
  }
  async function load() {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (filterCat !== "") u.set("categoryId", String(filterCat));
    const res = await fetch(`/api/admin/subcategories?${u.toString()}`, { cache: "no-store" });
    const data = await res.json(); if (data.ok) setItems(data.items);
  }
  useEffect(() => { loadCats(); load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const cid = categoryId === "" ? undefined : Number(categoryId);
    if (!cid) { alert("Elegí una categoría"); return; }
    const res = await fetch("/api/admin/subcategories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined, categoryId: cid })
    });
    const data = await res.json();
    if (data.ok) { setName(""); setSlug(""); setCategoryId(""); await load(); } else alert(data.error || "Error");
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar subcategoría?")) return;
    const res = await fetch(`/api/admin/subcategories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setItems(prev => prev.filter(x => x.id !== id));
    else alert(data.error || "No se pudo borrar");
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Subcategorías</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded p-2" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded p-2" placeholder="Slug (opcional)" value={slug} onChange={e=>setSlug(e.target.value)} />
          <select className="border rounded p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value===""? "": Number(e.target.value))}>
            <option value="">Categoría…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="border rounded px-4" type="submit">Crear</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input className="border rounded p-2" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded p-2" value={filterCat} onChange={e=>setFilterCat(e.target.value===""? "": Number(e.target.value))}>
          <option value="">Todas las categorías</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="border rounded px-3" onClick={load}>Filtrar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Slug</th>
              <th className="p-2 border">Categoría</th>
              <th className="p-2 border w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s=>(
              <tr key={s.id}>
                <td className="p-2 border">{s.id}</td>
                <td className="p-2 border">{s.name}</td>
                <td className="p-2 border">{s.slug}</td>
                <td className="p-2 border">{cats.find(c=>c.id===s.categoryId)?.name ?? "-"}</td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>onDelete(s.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 text-sm opacity-70" colSpan={5}>Sin subcategorías</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}