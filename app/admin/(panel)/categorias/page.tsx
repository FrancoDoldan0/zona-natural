"use client";
import { useEffect, useState } from "react";

type Category = { id: number; name: string; slug: string };

export default function CategoriasPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    const res = await fetch(`/api/admin/categories?${u.toString()}`, { cache: "no-store" });
    const data = await res.json(); if (data.ok) setItems(data.items);
  }
  useEffect(() => { load(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined })
    });
    const data = await res.json();
    if (data.ok) { setName(""); setSlug(""); await load(); } else alert(data.error || "Error");
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar categoría (y sus subcategorías)?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setItems(prev => prev.filter(x => x.id !== id));
    else alert(data.error || "No se pudo borrar");
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border rounded p-2" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded p-2" placeholder="Slug (opcional)" value={slug} onChange={e=>setSlug(e.target.value)} />
          <button className="border rounded px-4" type="submit">Crear</button>
        </div>
      </form>

      <div className="flex gap-2">
        <input className="border rounded p-2" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="border rounded px-3" onClick={load}>Filtrar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border rounded">
          <thead><tr className="bg-gray-50"><th className="p-2 border">ID</th><th className="p-2 border">Nombre</th><th className="p-2 border">Slug</th><th className="p-2 border w-28">Acciones</th></tr></thead>
          <tbody>
            {items.map(c=>(
              <tr key={c.id}>
                <td className="p-2 border">{c.id}</td>
                <td className="p-2 border">{c.name}</td>
                <td className="p-2 border">{c.slug}</td>
                <td className="p-2 border"><button className="text-red-600" onClick={()=>onDelete(c.id)}>Eliminar</button></td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 text-sm opacity-70" colSpan={4}>Sin categorías</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}