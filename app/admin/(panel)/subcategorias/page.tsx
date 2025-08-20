"use client";
import { useEffect, useState } from "react";

type Category = { id: number; name: string; slug: string };
type Subcategory = { id: number; name: string; slug: string; categoryId: number; category?: Category };

export default function SubcategoriasPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Subcategory[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function loadCats() {
    const res = await fetch("/api/admin/categories?take=999", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setCats(data.items);
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId !== "") params.set("categoryId", String(categoryId));
    const res = await fetch(`/api/admin/subcategories?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setLoading(false);
    if (data.ok) setItems(data.items);
    else setErr(data.error || "Error");
  }

  useEffect(() => { loadCats(); load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (categoryId === "") { setErr("Elegí una categoría"); return; }
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined, categoryId })
    });
    const data = await res.json();
    if (data.ok) { setName(""); setSlug(""); setCategoryId(""); await load(); }
    else setErr(data.error || "Error");
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar subcategoría?")) return;
    const res = await fetch(`/api/admin/subcategories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setItems(prev => prev.filter(x => x.id !== id));
    else alert(data.error || "No se pudo borrar");
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Subcategorías</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border rounded p-2" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded p-2" placeholder="Slug (opcional)" value={slug} onChange={e=>setSlug(e.target.value)} />
          <select className="border rounded p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value===""? "": Number(e.target.value))}>
            <option value="">Categoría…</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="border rounded px-4 py-2" type="submit">Crear</button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input className="border rounded p-2" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded p-2" value={categoryId} onChange={e=>setCategoryId(e.target.value===""? "": Number(e.target.value))}>
          <option value="">Todas las categorías</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="border rounded px-3" onClick={load}>Filtrar</button>
        {loading && <span className="text-sm opacity-70">Cargando…</span>}
      </div>

      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">ID</th>
            <th className="text-left p-2 border">Nombre</th>
            <th className="text-left p-2 border">Slug</th>
            <th className="text-left p-2 border">Categoría</th>
            <th className="text-left p-2 border w-28">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map(sc => (
            <tr key={sc.id}>
              <td className="p-2 border">{sc.id}</td>
              <td className="p-2 border">{sc.name}</td>
              <td className="p-2 border">{sc.slug}</td>
              <td className="p-2 border">{sc.category?.name ?? sc.categoryId}</td>
              <td className="p-2 border">
                <button className="text-red-600" onClick={()=>onDelete(sc.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr><td className="p-3 text-sm opacity-70" colSpan={5}>Sin subcategorías</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}