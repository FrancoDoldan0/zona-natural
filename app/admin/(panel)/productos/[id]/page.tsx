'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; categoryId: number };
type ProductImage = { id: number; url: string; alt?: string | null; sortOrder?: number | null };
type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  categoryId: number | null;
  subcategoryId: number | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
  images?: ProductImage[];
};

async function fetchFirstOk<T>(urls: string[], init?: RequestInit): Promise<T> {
  for (const u of urls) {
    try {
      const r = await fetch(u, init);
      if (r.ok) return (await r.json()) as T;
    } catch {}
  }
  throw new Error('No pude leer la API en ninguna ruta.');
}

export default function AdminProductEditPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);

  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  // campos
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('');

  const subOptions = useMemo(
    () => subs.filter((s) => (categoryId === '' ? true : s.categoryId === Number(categoryId))),
    [subs, categoryId],
  );

  async function load() {
    setLoading(true);

    const [catsData, subsData] = await Promise.all([
      fetchFirstOk<{ ok?: boolean; items?: Category[]; data?: Category[] }>([
        '/api/admin/categories?take=999',
        '/api/admin/categorias?take=999',
      ]),
      fetchFirstOk<{ ok?: boolean; items?: Subcategory[]; data?: Subcategory[] }>([
        '/api/admin/subcategories?take=999',
        '/api/admin/subcategorias?take=999',
      ]),
    ]);

    setCats(catsData.items ?? catsData.data ?? []);
    setSubs(subsData.items ?? subsData.data ?? []);

    const prod = await fetchFirstOk<{ ok?: boolean; item?: Product; id?: number }>([
      `/api/admin/products/${id}`,
      `/api/admin/productos/${id}`,
    ]);

    const p = prod.item as Product;
    setName(p.name ?? '');
    setSlug(p.slug ?? '');
    setDescription(p.description ?? '');
    setPrice(p.price != null ? String(p.price) : '');
    setSku(p.sku ?? '');
    setStatus((p.status as any) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setCategoryId(p.categoryId ?? '');
    setSubcategoryId(p.subcategoryId ?? '');

    setLoading(false);
  }

  useEffect(() => {
    load().catch((e) => {
      console.error(e);
      alert('No pude cargar el producto.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const body: any = {
      name: name.trim(),
      // Si el slug se deja vacío, la API lo recalcula con el nombre
      ...(slug.trim() !== '' ? { slug: slug.trim() } : {}),
      description: description.trim() || null,
      price: price.trim() === '' ? null : Number(price),
      sku: sku.trim() || null,
      status,
      categoryId: categoryId === '' ? null : Number(categoryId),
      subcategoryId: subcategoryId === '' ? null : Number(subcategoryId),
    };

    const reqInit: RequestInit = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };

    try {
      const r = await fetch(`/api/admin/products/${id}`, reqInit);
      if (!r.ok) {
        // fallback a /productos
        const r2 = await fetch(`/api/admin/productos/${id}`, reqInit);
        if (!r2.ok) throw new Error(await r2.text());
      }
      alert('Guardado ✔');
      await load();
    } catch (e: any) {
      console.error(e);
      alert('No se pudo guardar. ' + (e?.message ?? ''));
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Editar producto #{id}</h1>

      <div className="flex items-center gap-3">
        <Link href="/admin/productos" className="underline">
          ← Volver
        </Link>
        <Link href={`/admin/productos/${id}/imagenes`} className="underline">
          Administrar imágenes
        </Link>
        {!loading && (
          <Link href={`/productos/${slug}`} target="_blank" className="underline">
            Ver en tienda
          </Link>
        )}
      </div>

      <form onSubmit={onSave} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-sm opacity-70">Nombre</span>
            <input
              className="border rounded p-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">Slug (opcional)</span>
            <input
              className="border rounded p-2 w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="vacío = se recalcula"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">Precio</span>
            <input
              className="border rounded p-2 w-full"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="ej: 199.99"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">SKU</span>
            <input
              className="border rounded p-2 w-full"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">Estado</span>
            <select
              className="border rounded p-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">Categoría</span>
            <select
              className="border rounded p-2 w-full"
              value={categoryId}
              onChange={(e) => {
                const v = e.target.value === '' ? '' : Number(e.target.value);
                setCategoryId(v);
                setSubcategoryId('');
              }}
            >
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm opacity-70">Subcategoría</span>
            <select
              className="border rounded p-2 w-full"
              value={subcategoryId}
              onChange={(e) =>
                setSubcategoryId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {subOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-sm opacity-70">Descripción</span>
          <textarea
            className="border rounded p-2 w-full"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <button className="border rounded px-4 py-2" type="submit" disabled={loading}>
          {loading ? 'Cargando…' : 'Guardar cambios'}
        </button>
      </form>
    </main>
  );
}
