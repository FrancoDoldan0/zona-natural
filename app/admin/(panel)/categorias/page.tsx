"use client";
import { useEffect, useState } from "react";

type Category = { id: number; name: string; slug: string };

export default function CategoriasPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/categories?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const data = await res.json();
    setLoading(false);
    if (data.ok) setItems(data.items);
    else setErr(data.error || "Error");
  }

  useEffect(() => { load(); }, []); // carga inicial

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined })
    });
    const data = await res.json();
    if (data.ok) { setName(""); setSlug(""); await load(); }
    else setErr(data.error || "Error");
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar categoría?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) setItems(prev => prev.filter(x => x.id !== id));
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Categorías</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="flex gap-2">
          <input className="border rounded p-2 flex-1" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded p-2 flex-1" placeholder="Slug (opcional)" value={slug} onChange={e=>setSlug(e.target.value)} />
          <button className="border rounded px-4" type="submit">Crear</button>
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>

      <div className="flex items-center gap-2">
        <input className="border rounded p-2 flex-1" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} />
        <button className="border rounded px-3" onClick={load}>Buscar</button>
        {loading && <span className="text-sm opacity-70">Cargando…</span>}
      </div>

      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2 border">ID</th>
            <th className="text-left p-2 border">Nombre</th>
            <th className="text-left p-2 border">Slug</th>
            <th className="text-left p-2 border w-28">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="p-2 border">{c.id}</td>
              <td className="p-2 border">{c.name}</td>
              <td className="p-2 border">{c.slug}</td>
              <td className="p-2 border">
                <button className="text-red-600" onClick={()=>onDelete(c.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr><td className="p-3 text-sm opacity-70" colSpan={4}>Sin categorías</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}