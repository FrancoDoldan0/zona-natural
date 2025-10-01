'use client';

import { useEffect, useMemo, useState } from 'react';

// Tipos simples acordes a tu API / DB
type DiscountType = 'PERCENT' | 'AMOUNT';
type Offer = {
  id: number;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountVal: number;
  startAt: string | null; // ISO
  endAt: string | null;   // ISO
  productId: number | null;
  categoryId: number | null;
  tagId?: number | null;  // (tu POST actual no lo usa)
  createdAt?: string;
  updatedAt?: string;
};

function nowIsoLocalForInput(d?: Date) {
  const dt = d ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const HH = pad(dt.getHours());
  const MM = pad(dt.getMinutes());
  // input[type=datetime-local] espera "YYYY-MM-DDTHH:MM"
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}

function isActive(o: Offer, now = new Date()) {
  const s = o.startAt ? new Date(o.startAt) : null;
  const e = o.endAt ? new Date(o.endAt) : null;
  const okStart = !s || s <= now;
  const okEnd = !e || e >= now;
  return okStart && okEnd;
}

export default function AdminOffersPage() {
  // Lista
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [discountVal, setDiscountVal] = useState<number>(10);

  type Scope = 'general' | 'category' | 'product';
  const [scope, setScope] = useState<Scope>('general');
  const [categoryId, setCategoryId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');

  const [startAt, setStartAt] = useState<string>(nowIsoLocalForInput());
  const [endAt, setEndAt] = useState<string>('');

  async function fetchJson(u: string, init?: RequestInit) {
    const r = await fetch(u, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init?.headers || {}),
        Accept: 'application/json',
        'content-type': init?.body ? 'application/json' : (init?.headers as any)?.['content-type'],
      },
      credentials: 'include',
    });
    const txt = await r.text();
    const json = txt && (txt.startsWith('{') || txt.startsWith('[')) ? JSON.parse(txt) : null;
    if (!r.ok) {
      const msg = json?.detail || json?.error || `${r.status} ${r.statusText}`;
      throw new Error(typeof msg === 'string' ? msg : 'Fallo de la API');
    }
    return json;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson('/api/admin/offers');
      const arr: Offer[] = Array.isArray(data) ? data : data?.items ?? [];
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body: any = {
        title: title.trim(),
        description: description.trim() || null,
        discountType,
        discountVal: Number(discountVal),
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
      };

      if (scope === 'category') {
        body.categoryId = Number(categoryId) || null;
      } else if (scope === 'product') {
        body.productId = Number(productId) || null;
      }

      const created = await fetchJson('/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Limpio formulario “rápido”
      setTitle('');
      setDescription('');
      setDiscountType('PERCENT');
      setDiscountVal(10);
      setScope('general');
      setCategoryId('');
      setProductId('');
      setStartAt(nowIsoLocalForInput());
      setEndAt('');

      // Refresco lista
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  const sorted = useMemo(() => {
    const n = new Date();
    // Activas primero
    return [...items].sort((a, b) => Number(isActive(b, n)) - Number(isActive(a, n)) || b.id - a.id);
  }, [items]);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Ofertas</h1>
        <button
          onClick={load}
          className="rounded px-4 py-2 border"
          title="Refrescar"
        >
          Refrescar
        </button>
      </div>

      <form onSubmit={onCreate} className="grid gap-3 p-4 border rounded mb-8 bg-white">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="border rounded p-2"
              maxLength={120}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Descripción (opcional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border rounded p-2"
              maxLength={500}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Tipo de descuento</span>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              className="border rounded p-2"
            >
              <option value="PERCENT">% Porcentaje</option>
              <option value="AMOUNT">$ Monto fijo</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Valor</span>
            <input
              type="number"
              step="any"
              min="0"
              value={discountVal}
              onChange={(e) => setDiscountVal(Number(e.target.value))}
              className="border rounded p-2"
              required
            />
          </label>

          <div className="grid gap-1">
            <span className="text-sm">Ámbito</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="general"
                  checked={scope === 'general'}
                  onChange={() => setScope('general')}
                />
                General
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="category"
                  checked={scope === 'category'}
                  onChange={() => setScope('category')}
                />
                Categoría
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scope"
                  value="product"
                  checked={scope === 'product'}
                  onChange={() => setScope('product')}
                />
                Producto
              </label>
            </div>
          </div>
        </div>

        {scope === 'category' && (
          <label className="grid gap-1">
            <span className="text-sm">Category ID</span>
            <input
              type="number"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="border rounded p-2"
              placeholder="Ej: 1"
              required
            />
          </label>
        )}

        {scope === 'product' && (
          <label className="grid gap-1">
            <span className="text-sm">Product ID</span>
            <input
              type="number"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="border rounded p-2"
              placeholder="Ej: 7"
              required
            />
          </label>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Inicio</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Fin (opcional)</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="border rounded p-2"
            />
          </label>
        </div>

        {error && <div className="text-sm text-red-600">Error: {error}</div>}

        <div className="flex gap-3">
          <button className="rounded px-4 py-2 bg-black text-white">Crear</button>
          <button
            type="button"
            onClick={load}
            className="rounded px-4 py-2 border"
          >
            Cancelar
          </button>
        </div>
      </form>

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">Ofertas cargadas</h2>

        {loading ? (
          <div>Cargando…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">Sin ofertas aún.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Título</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">Ámbito</th>
                <th className="py-2 pr-3">Periodo</th>
                <th className="py-2 pr-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => {
                const active = isActive(o);
                return (
                  <tr key={o.id} className="border-b">
                    <td className="py-2 pr-3">{o.id}</td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{o.title}</div>
                      {o.description && <div className="text-gray-600">{o.description}</div>}
                    </td>
                    <td className="py-2 pr-3">{o.discountType}</td>
                    <td className="py-2 pr-3">{o.discountVal}</td>
                    <td className="py-2 pr-3">
                      {o.productId
                        ? `Producto #${o.productId}`
                        : o.categoryId
                        ? `Categoría #${o.categoryId}`
                        : 'General'}
                    </td>
                    <td className="py-2 pr-3">
                      {o.startAt ? new Date(o.startAt).toLocaleString() : '—'} →{' '}
                      {o.endAt ? new Date(o.endAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-800'
                        }`}
                      >
                        {active ? 'Activa' : 'No activa'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
