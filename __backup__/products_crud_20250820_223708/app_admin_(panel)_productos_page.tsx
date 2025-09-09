'use client';
import { useEffect, useMemo, useState } from 'react';

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; categoryId: number };
type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  status: string;
  categoryId: number | null;
  subcategoryId: number | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
};

export default function ProductosPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Product[]>([]);

  // filtros
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState<number | ''>('');
  const [fSub, setFSub] = useState<number | ''>('');
  const subOptions = useMemo(
    () => subs.filter((s) => (fCat === '' ? true : s.categoryId === Number(fCat))),
    [subs, fCat],
  );

  // form crear
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [cId, setCId] = useState<number | ''>('');
  const [sId, setSId] = useState<number | ''>('');

  async function loadCats() {
    const res = await fetch('/api/admin/categories?take=999', { cache: 'no-store' });
    const data = await res.json();
    if (data.ok) setCats(data.items);
  }
  async function loadSubs() {
    const res = await fetch('/api/admin/subcategories?take=999', { cache: 'no-store' });
    const data = await res.json();
    if (data.ok) setSubs(data.items);
  }
  async function load() {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (fCat !== '') u.set('categoryId', String(fCat));
    if (fSub !== '') u.set('subcategoryId', String(fSub));
    const res = await fetch(`/api/admin/products?${u.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.ok) setItems(data.items);
  }

  useEffect(() => {
    loadCats();
    loadSubs();
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { name, status };
    if (description.trim() !== '') body.description = description.trim();
    if (price.trim() !== '') body.price = Number(price);
    if (sku.trim() !== '') body.sku = sku.trim();
    if (cId !== '') body.categoryId = Number(cId);
    if (sId !== '') body.subcategoryId = Number(sId);

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) {
      setName('');
      setDescription('');
      setPrice('');
      setSku('');
      setCId('');
      setSId('');
      await load();
    } else {
      alert(data.error || 'Error');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar producto?')) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) setItems((prev) => prev.filter((x) => x.id !== id));
    else alert(data.error || 'No se pudo borrar');
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Productos</h1>

      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            className="border rounded p-2 md:col-span-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border rounded p-2"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            className="border rounded p-2"
            placeholder="SKU (opcional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <select
            className="border rounded p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
          </select>
          <select
            className="border rounded p-2"
            value={cId}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value);
              setCId(v);
              setSId('');
            }}
          >
            <option value="">Categoría</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded p-2"
            value={sId}
            onChange={(e) => setSId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Subcategoría</option>
            {subOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="border rounded p-2 w-full"
          rows={3}
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className="border rounded px-4" type="submit">
          Crear
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded p-2"
          placeholder="Buscar por nombre/slug/SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={fCat}
          onChange={(e) => {
            const v = e.target.value === '' ? '' : Number(e.target.value);
            setFCat(v);
            setFSub('');
          }}
        >
          <option value="">Todas las categorías</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="border rounded p-2"
          value={fSub}
          onChange={(e) => setFSub(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Todas las subcategorías</option>
          {subOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="border rounded px-3" onClick={load}>
          Filtrar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Slug</th>
              <th className="p-2 border">Precio</th>
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Categoría</th>
              <th className="p-2 border">Subcat.</th>
              <th className="p-2 border">Descripción</th>
              <th className="p-2 border w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="p-2 border">{p.id}</td>
                <td className="p-2 border">{p.name}</td>
                <td className="p-2 border">{p.slug}</td>
                <td className="p-2 border">{p.price ?? '-'}</td>
                <td className="p-2 border">{p.sku ?? '-'}</td>
                <td className="p-2 border">{p.status}</td>
                <td className="p-2 border">{p.category?.name ?? '-'}</td>
                <td className="p-2 border">{p.subcategory?.name ?? '-'}</td>
                <td className="p-2 border max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {p.description ?? '-'}
                </td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={() => onDelete(p.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-3 text-sm opacity-70" colSpan={10}>
                  Sin productos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
