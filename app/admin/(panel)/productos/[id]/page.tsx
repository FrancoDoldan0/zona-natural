// app/admin/(panel)/productos/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; categoryId: number };
type ProductImage = { id: number; url: string; alt?: string | null; sortOrder?: number | null };

type Status = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' | 'AGOTADO';

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  status: Status;
  categoryId: number | null;
  subcategoryId: number | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
  images?: ProductImage[];
};

const STATUS_OPTS: Status[] = ['ACTIVE', 'AGOTADO', 'INACTIVE', 'DRAFT', 'ARCHIVED'];

async function readJsonSafe(res: Response): Promise<{ json: any | null; text: string }> {
  const ct = res.headers.get('content-type') || '';
  const body = await res.text();
  if (ct.includes('application/json')) {
    try {
      return { json: JSON.parse(body), text: body };
    } catch {}
  }
  return { json: null, text: body };
}

async function fetchTry(urls: string[], init?: RequestInit) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { ...init, cache: 'no-store' });
      const { json, text } = await readJsonSafe(r);
      if (!r.ok) {
        lastErr = new Error(
          `HTTP ${r.status} ${r.statusText} — ${text?.slice(0, 200) || '(sin cuerpo)'} @ ${u}`,
        );
        continue;
      }
      return json ?? text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('No pude leer la API.');
}

export default function AdminProductEditPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number.parseInt(String(idParam ?? ''), 10);

  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // campos
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<Status>('ACTIVE');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('');

  const subOptions = useMemo(
    () => subs.filter((s) => (categoryId === '' ? true : s.categoryId === Number(categoryId))),
    [subs, categoryId],
  );

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [catsData, subsData] = await Promise.all([
        fetchTry(['/api/admin/categories?take=999', '/api/admin/categorias?take=999']),
        fetchTry(['/api/admin/subcategories?take=999', '/api/admin/subcategorias?take=999']),
      ]);

      setCats(catsData.items ?? catsData.data ?? []);
      setSubs(subsData.items ?? subsData.data ?? []);

      // 1º intento por query (?id=); fallback a /:id
      const prod = await fetchTry([
        `/api/admin/products?id=${id}`,
        `/api/admin/productos?id=${id}`,
        `/api/admin/products/${id}`,
        `/api/admin/productos/${id}`,
      ]);

      if (!prod?.ok || !prod?.item)
        throw new Error(prod?.error || 'Formato inesperado en detalle de producto');

      const p = prod.item as Product;
      setName(p?.name ?? '');
      setSlug(p?.slug ?? '');
      setDescription(p?.description ?? '');
      setPrice(p?.price != null ? String(p.price) : '');
      setSku(p?.sku ?? '');
      setStatus(STATUS_OPTS.includes(p?.status as Status) ? (p.status as Status) : 'ACTIVE');
      setCategoryId(p?.categoryId ?? '');
      setSubcategoryId(p?.subcategoryId ?? '');
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || 'No pude cargar el producto.');
      alert('No pude cargar el producto.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) {
      console.error('ID de producto inválido en la URL');
      setErr('ID inválido');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const body: any = {
        name: name.trim(),
        // Si el slug se deja vacío, la API lo recalcula (mandamos slug: "")
        ...(slug.trim() !== '' ? { slug: slug.trim() } : { slug: '' }),
        description: description.trim() || null,
        price: price.trim() === '' ? null : Number(price.replace(',', '.')),
        sku: sku.trim() || null,
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        subcategoryId: subcategoryId === '' ? null : Number(subcategoryId),
      };

      // PUT seguro por ?id= y fallback a /:id
      await fetchTry(
        [`/api/admin/products?id=${id}`, `/api/admin/productos?id=${id}`],
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        },
      ).catch(async () => {
        await fetchTry(
          [`/api/admin/products/${id}`, `/api/admin/productos/${id}`],
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
          },
        );
      });

      alert('Guardado ✔');
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || 'No se pudo guardar.');
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
        {!loading && slug && (
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
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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

      {err && <p className="text-sm text-red-600">Error: {err}</p>}
    </main>
  );
}
