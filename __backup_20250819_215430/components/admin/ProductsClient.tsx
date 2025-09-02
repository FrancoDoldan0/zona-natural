"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: string; name: string; slug: string };
type Sub = { id: string; name: string; slug: string; categoryId: string };
type Prod = {
  id: string; name: string; slug: string; description?: string | null;
  priceCents?: number | null; sku?: string | null; status: "ACTIVE" | "DRAFT";
  categoryId: string; subcategoryId?: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export default function ProductsClient({
  initialCats, initialSubs, initialProds
}: { initialCats: Cat[]; initialSubs: Sub[]; initialProds: Prod[] }) {
  const r = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState(initialCats[0]?.id || "");
  const [subcategoryId, setSubcategoryId] = useState<string | "">("");
  const [price, setPrice] = useState<string>("");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState<"ACTIVE"|"DRAFT">("ACTIVE");

  const subsForCat = useMemo(
    () => initialSubs.filter(s => s.categoryId === categoryId),
    [initialSubs, categoryId]
  );

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || undefined,
        price: price ? Number(price) : undefined,
        sku: sku || undefined,
        status,
        categoryId,
        subcategoryId: subcategoryId || undefined
      })
    });
    if (res.ok) {
      setName(""); setSlug(""); setPrice(""); setSku("");
      r.refresh();
    }
  }

  return (
    <>
      <form onSubmit={createProduct} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className="text-xs">Nombre</span>
          <input className="border rounded px-3 py-2 w-full" value={name} onChange={e=>setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-xs">Slug (opcional)</span>
          <input className="border rounded px-3 py-2 w-full" value={slug} onChange={e=>setSlug(slugify(e.target.value))} />
        </label>
        <label className="block">
          <span className="text-xs">Precio (ej: 199.99)</span>
          <input className="border rounded px-3 py-2 w-full" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs">SKU</span>
          <input className="border rounded px-3 py-2 w-full" value={sku} onChange={e=>setSku(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs">Categoría</span>
          <select className="border rounded px-3 py-2 w-full" value={categoryId} onChange={e=>{setCategoryId(e.target.value); setSubcategoryId("");}}>
            {initialCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs">Subcategoría</span>
          <select className="border rounded px-3 py-2 w-full" value={subcategoryId} onChange={e=>setSubcategoryId(e.target.value)}>
            <option value="">(ninguna)</option>
            {subsForCat.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs">Estado</span>
          <select className="border rounded px-3 py-2 w-full" value={status} onChange={e=>setStatus(e.target.value as any)}>
            <option value="ACTIVE">Activo</option>
            <option value="DRAFT">Borrador</option>
          </select>
        </label>
        <button className="rounded bg-black text-white px-4 py-2">Crear</button>
      </form>

      <table className="w-full text-sm border mt-6">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-2 border-r">Nombre</th>
            <th className="text-left p-2 border-r">Slug</th>
            <th className="text-left p-2 border-r">Precio</th>
            <th className="text-left p-2 border-r">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {initialProds.map(p => (
            <Row key={p.id} prod={p} onDone={() => r.refresh()} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function Row({ prod, onDone }: { prod: Prod; onDone: () => void }) {
  const [n, setN] = useState(prod.name);
  const [s, setS] = useState(prod.slug);
  const [price, setPrice] = useState<string>(prod.priceCents != null ? (prod.priceCents/100).toFixed(2) : "");
  const [status, setStatus] = useState<"ACTIVE"|"DRAFT">(prod.status);

  async function save() {
    const res = await fetch(`/api/admin/products/${prod.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: n,
        slug: s,
        price: price ? Number(price) : null,
        status
      })
    });
    if (res.ok) onDone();
  }
  async function remove() {
    if (!confirm("¿Eliminar producto?")) return;
    const res = await fetch(`/api/admin/products/${prod.id}`, { method: "DELETE" });
    if (res.ok) onDone();
  }

  return (
    <tr className="border-t">
      <td className="p-2 border-r w-[30%]">
        <input className="border rounded px-2 py-1 w-full" value={n} onChange={e=>setN(e.target.value)} />
      </td>
      <td className="p-2 border-r w-[25%]">
        <input className="border rounded px-2 py-1 w-full" value={s} onChange={e=>setS(slugify(e.target.value))} />
      </td>
      <td className="p-2 border-r w-[20%]">
        <input className="border rounded px-2 py-1 w-full" inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} />
      </td>
      <td className="p-2 border-r w-[15%]">
        <select className="border rounded px-2 py-1" value={status} onChange={e=>setStatus(e.target.value as any)}>
          <option value="ACTIVE">Activo</option>
          <option value="DRAFT">Borrador</option>
        </select>
      </td>
      <td className="p-2">
        <button className="rounded bg-gray-800 text-white px-3 py-1" onClick={save}>Guardar</button>
        <button className="ml-2 rounded bg-red-600 text-white px-3 py-1" onClick={remove}>Eliminar</button>
      </td>
    </tr>
  );
}
