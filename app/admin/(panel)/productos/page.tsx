// app/admin/(panel)/productos/page.tsx
'use client';

import Link from 'next/link';
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
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | string;
  categoryId: number | null;
  subcategoryId: number | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
};

type ApiListOk = { ok: true; items: Product[]; total?: number };
type ApiErr = { ok: false; error: string };
type ApiListResponse = ApiListOk | ApiErr;

const DEFAULT_LIMIT = 20;

/** Fallback: primero prueba /products y si no, /productos */
async function callApi(pathEn: string, pathEs: string, init?: RequestInit) {
  const baseInit: RequestInit = {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.headers || {}),
      ...(init?.method && init.method.toUpperCase() !== 'GET'
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  };
  const resEn = await fetch(pathEn, baseInit);
  if (resEn.ok) return resEn;
  // si 404 u otro error, intentamos español
  const resEs = await fetch(pathEs, baseInit);
  return resEs;
}

export default function ProductosPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState<number | ''>('');
  const [fSub, setFSub] = useState<number | ''>('');
  const subOptions = useMemo(
    () => subs.filter((s) => (fCat === '' ? true : s.categoryId === Number(fCat))),
    [subs, fCat],
  );

  // paginación (limit/offset)
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  // form crear
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');
  const [cId, setCId] = useState<number | ''>('');
  const [sId, setSId] = useState<number | ''>('');

  async function loadCats() {
    const res = await fetch('/api/admin/categories?take=999', { cache: 'no-store' });
    const data = await res.json<any>();
    if (data.ok) setCats(data.items);
  }
  async function loadSubs() {
    const res = await fetch('/api/admin/subcategories?take=999', { cache: 'no-store' });
    const data = await res.json<any>();
    if (data.ok) setSubs(data.items);
  }

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const u = new URLSearchParams();
      u.set('limit', String(limit));
      u.set('offset', String(offset));
      if (q.trim()) u.set('q', q.trim());
      if (fCat !== '') u.set('categoryId', String(fCat));
      if (fSub !== '') u.set('subcategoryId', String(fSub));

      const urlEn = `/api/admin/products?${u.toString()}`;
      const urlEs = `/api/admin/productos?${u.toString()}`;
      const res = await callApi(urlEn, urlEs);
      const data: ApiListResponse = await res.json();

      if (!res.ok || !('ok' in data) || data.ok !== true) {
        throw new Error((data as any)?.error || `Error ${res.status}`);
      }

      const list =
        (data as any).items ??
        (data as any).data ??
        (data as any).rows ??
        ([] as Product[]);

      const count =
        typeof (data as any).total === 'number' ? (data as any).total : list.length;

      setItems(list);
      setTotal(count);
    } catch (e: any) {
      setErr(e?.message || 'Error al cargar productos');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCats();
    loadSubs();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]); // filtros q/fCat/fSub se disparan manualmente con "Filtrar"

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const body: any = { name: name.trim(), status };
      if (description.trim() !== '') body.description = description.trim();
      if (price.trim() !== '') body.price = Number(price.replace(',', '.'));
      if (sku.trim() !== '') body.sku = sku.trim();
      if (cId !== '') body.categoryId = Number(cId);
      if (sId !== '') body.subcategoryId = Number(sId);

      const res = await callApi('/api/admin/products', '/api/admin/productos', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json<any>();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error || 'Error');

      // limpiar
      setName('');
      setDescription('');
      setPrice('');
      setSku('');
      setCId('');
      setSId('');
      setStatus('ACTIVE');

      // volver a la primera página y recargar
      setOffset(0);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error al crear producto');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      const res = await callApi(
        `/api/admin/products/${id}`,
        `/api/admin/productos/${id}`,
        { method: 'DELETE' },
      );
      const data = await res.json<any>();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error || 'No se pudo borrar');
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      alert(e?.message || 'No se pudo borrar');
    }
  }

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Productos</h1>

      {/* Crear */}
      <form onSubmit={onCreate} className="border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            className="border rounded p-2 md:col-span-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="border rounded p-2"
            placeholder="Precio"
            inputMode="decimal"
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
            <option value="ARCHIVED">ARCHIVED</option>
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

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded p-2"
          placeholder="Buscar por nombre/slug/SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setOffset(0), load())}
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
        <button
          className="border rounded px-3"
          onClick={() => {
            setOffset(0);
            load();
          }}
        >
          Filtrar
        </button>
      </div>

      {/* Tabla */}
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
              <th className="p-2 border w-36">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-sm opacity-70" colSpan={10}>
                  Cargando…
                </td>
              </tr>
            ) : items.length ? (
              items.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.id}</td>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.slug}</td>
                  <td className="p-2 border">
                    {typeof p.price === 'number'
                      ? `$${p.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="p-2 border">{p.sku ?? '-'}</td>
                  <td className="p-2 border">{p.status}</td>
                  <td className="p-2 border">{p.category?.name ?? '-'}</td>
                  <td className="p-2 border">{p.subcategory?.name ?? '-'}</td>
                  <td className="p-2 border max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    {p.description ?? '-'}
                  </td>
                  <td className="p-2 border space-x-2">
                    <Link href={`/admin/productos/${p.id}`} className="text-blue-600 underline">
                      Editar
                    </Link>
                    <button className="text-red-600" onClick={() => onDelete(p.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-sm opacity-70" colSpan={10}>
                  Sin productos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between border rounded p-2">
        <div className="text-sm opacity-80">
          {total > 0 ? `Mostrando ${items.length} de ${total} (p. ${page}/${Math.max(1, Math.ceil(total / limit))})` : '—'}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="border rounded px-3 py-1 disabled:opacity-40"
            disabled={loading || offset <= 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            ← Anterior
          </button>
          <select
            className="border rounded px-2 py-1"
            value={limit}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value, 10) || DEFAULT_LIMIT);
              setLimit(v);
              setOffset(0);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
          <button
            className="border rounded px-3 py-1 disabled:opacity-40"
            disabled={loading || offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">Error: {err}</p>}
    </main>
  );
}
