'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ProductOpt = { id: number; name: string; slug: string };
type CategoryOpt = { id: number; name: string; slug: string };
type Offer = {
  id: number;
  title: string;
  description: string | null;
  discountType: 'PERCENT' | 'AMOUNT';
  discountVal: number;
  startAt: string | null;
  endAt: string | null;
  product?: { id: number; name: string; slug: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

function toLocalInput(dt: string | null | undefined) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(+d)) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OffersPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dtype, setDtype] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [dval, setDval] = useState('10');
  const [target, setTarget] = useState<'general' | 'product' | 'category'>('general');
  const [prodQ, setProdQ] = useState('');
  const [prodSel, setProdSel] = useState<ProductOpt | null>(null);
  const [catQ, setCatQ] = useState('');
  const [catSel, setCatSel] = useState<CategoryOpt | null>(null);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  async function load() {
    const r = await fetch('/api/admin/offers?all=1', { cache: 'no-store' });
    const j = await r.json<any>();
    if (j.ok) setItems(j.items);
  }
  useEffect(() => {
    load();
  }, []);

  // búsquedas
  const [prodOpts, setProdOpts] = useState<ProductOpt[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const url = '/api/admin/search/products?q=' + encodeURIComponent(prodQ);
      const r = await fetch(url);
      const j = await r.json<any>();
      if (j.ok) setProdOpts(j.items);
    }, 250);
    return () => clearTimeout(t);
  }, [prodQ]);
  const [catOpts, setCatOpts] = useState<CategoryOpt[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const url = '/api/admin/search/categories?q=' + encodeURIComponent(catQ);
      const r = await fetch(url);
      const j = await r.json<any>();
      if (j.ok) setCatOpts(j.items);
    }, 250);
    return () => clearTimeout(t);
  }, [catQ]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      title,
      description: description.trim() || null,
      discountType: dtype,
      discountVal: Number(dval || 0),
      startAt: startAt || null,
      endAt: endAt || null,
    };
    if (target === 'product' && prodSel) payload.productId = prodSel.id;
    if (target === 'category' && catSel) payload.categoryId = catSel.id;

    const r = await fetch('/api/admin/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json<any>();
    if (j.ok) {
      setTitle('');
      setDescription('');
      setDtype('PERCENT');
      setDval('10');
      setTarget('general');
      setProdSel(null);
      setCatSel(null);
      setStartAt('');
      setEndAt('');
      load();
    } else alert(j.error || 'Error');
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar esta oferta?')) return;
    const r = await fetch(`/api/admin/offers/${id}`, { method: 'DELETE' });
    const j = await r.json<any>();
    if (j.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  const preview = useMemo(() => {
    const val = dtype === 'PERCENT' ? `${Number(dval || 0)}%` : `$ ${Number(dval || 0).toFixed(2)}`;
    const tgt =
      target === 'general'
        ? 'General'
        : target === 'product'
          ? prodSel
            ? `Producto: ${prodSel.name}`
            : 'Producto (sin seleccionar)'
          : target === 'category'
            ? catSel
              ? `Categoría: ${catSel.name}`
              : 'Categoría (sin seleccionar)'
            : '';
    return `${val} · ${tgt}`;
  }, [dtype, dval, target, prodSel, catSel]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ofertas</h1>

      <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-6 border rounded p-4">
        <input
          className="border rounded p-2 md:col-span-3"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={dtype}
          onChange={(e) => setDtype(e.target.value as any)}
        >
          <option value="PERCENT">% Porcentaje</option>
          <option value="AMOUNT">$ Monto</option>
        </select>
        <input
          className="border rounded p-2"
          type="number"
          step="0.01"
          min="0"
          value={dval}
          onChange={(e) => setDval(e.target.value)}
        />
        <select
          className="border rounded p-2"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value as any);
            setProdSel(null);
            setCatSel(null);
          }}
        >
          <option value="general">General</option>
          <option value="product">Producto</option>
          <option value="category">Categoría</option>
        </select>

        <textarea
          className="border rounded p-2 md:col-span-6"
          placeholder="Descripción (opcional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {target === 'product' && (
          <div className="md:col-span-6 border rounded p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                className="border rounded p-2 flex-1"
                placeholder="Buscar producto por nombre/slug/SKU"
                value={prodQ}
                onChange={(e) => setProdQ(e.target.value)}
              />
              {prodSel && (
                <button
                  type="button"
                  className="border rounded px-2"
                  onClick={() => setProdSel(null)}
                >
                  Quitar
                </button>
              )}
            </div>
            {!prodSel && (
              <ul className="grid md:grid-cols-3 gap-2">
                {prodOpts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 w-full text-left"
                      onClick={() => setProdSel(p)}
                    >
                      {p.name} <span className="opacity-60">({p.slug})</span>
                    </button>
                  </li>
                ))}
                {!prodOpts.length && <li className="opacity-60">Sin resultados</li>}
              </ul>
            )}
            {prodSel && (
              <div className="opacity-80">
                Seleccionado: <b>{prodSel.name}</b>
              </div>
            )}
          </div>
        )}

        {target === 'category' && (
          <div className="md:col-span-6 border rounded p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                className="border rounded p-2 flex-1"
                placeholder="Buscar categoría"
                value={catQ}
                onChange={(e) => setCatQ(e.target.value)}
              />
              {catSel && (
                <button
                  type="button"
                  className="border rounded px-2"
                  onClick={() => setCatSel(null)}
                >
                  Quitar
                </button>
              )}
            </div>
            {!catSel && (
              <ul className="grid md:grid-cols-3 gap-2">
                {catOpts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 w-full text-left"
                      onClick={() => setCatSel(c)}
                    >
                      {c.name} <span className="opacity-60">({c.slug})</span>
                    </button>
                  </li>
                ))}
                {!catOpts.length && <li className="opacity-60">Sin resultados</li>}
              </ul>
            )}
            {catSel && (
              <div className="opacity-80">
                Seleccionada: <b>{catSel.name}</b>
              </div>
            )}
          </div>
        )}

        <div className="md:col-span-3">
          <label className="block text-sm opacity-80">Inicio (opcional)</label>
          <input
            className="border rounded p-2 w-full"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm opacity-80">Fin (opcional)</label>
          <input
            className="border rounded p-2 w-full"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>

        <div className="md:col-span-6 text-sm opacity-80">Vista previa: {preview}</div>

        <button className="border rounded px-4 py-2 md:col-span-6 w-fit" type="submit">
          Crear
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Desc.</th>
              <th className="p-2 border">Valor</th>
              <th className="p-2 border">Destino</th>
              <th className="p-2 border">Periodo</th>
              <th className="p-2 border w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const val =
                o.discountType === 'PERCENT'
                  ? `${o.discountVal}%`
                  : `$ ${o.discountVal.toFixed(2)}`;
              const tgt = o.product
                ? `Producto: ${o.product.name}`
                : o.category
                  ? `Categoría: ${o.category.name}`
                  : 'General';
              const per = [toLocalInput(o.startAt) || '—', toLocalInput(o.endAt) || '—'].join(
                ' → ',
              );
              return (
                <tr key={o.id}>
                  <td className="p-2 border">{o.id}</td>
                  <td className="p-2 border">{o.title}</td>
                  <td className="p-2 border">{o.description || '-'}</td>
                  <td className="p-2 border">{val}</td>
                  <td className="p-2 border">{tgt}</td>
                  <td className="p-2 border">{per}</td>
                  <td className="p-2 border">
                    <button className="text-red-600" onClick={() => onDelete(o.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td className="p-3 opacity-70" colSpan={7}>
                  Sin ofertas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm opacity-70">
        Tip: las ofertas públicas están en{' '}
        <Link href="/api/public/offers" className="underline">
          /api/public/offers
        </Link>
      </div>
    </main>
  );
}
