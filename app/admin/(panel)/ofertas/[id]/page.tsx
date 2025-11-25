'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

type ApiResult<T = unknown> = {
  ok?: boolean;
  error?: string;
} & T;

/* helpers reutilizados del listado ---------------------------- */

async function fetchList<T>(urls: string[]): Promise<T[]> {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      const text = await r.text();
      const data = ct.includes('application/json')
        ? (() => {
            try {
              return JSON.parse(text);
            } catch {
              return null;
            }
          })()
        : null;
      if (!r.ok) {
        lastErr = new Error(`${u} → ${r.status} ${r.statusText}`);
        continue;
      }
      if (!data) return [];
      if (Array.isArray(data)) return data as T[];
      if ((data as any).ok && Array.isArray((data as any).items)) {
        return (data as any).items as T[];
      }
      if (Array.isArray((data as any).data)) {
        return (data as any).data as T[];
      }
      return [];
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return [];
}

function toLocalInput(dt: string | null | undefined) {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(+d)) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* página ------------------------------------------------------ */

export default function OfferEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const offerId = Number(params?.id || 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dtype, setDtype] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [dval, setDval] = useState('0');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const [target, setTarget] = useState<'general' | 'product' | 'category'>(
    'general',
  );

  const [prodQ, setProdQ] = useState('');
  const [prodSel, setProdSel] = useState<ProductOpt | null>(null);
  const [prodOpts, setProdOpts] = useState<ProductOpt[]>([]);

  const [catQ, setCatQ] = useState('');
  const [catSel, setCatSel] = useState<CategoryOpt | null>(null);
  const [catOpts, setCatOpts] = useState<CategoryOpt[]>([]);

  // cargar oferta actual
  useEffect(() => {
    if (!offerId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/admin/offers/${offerId}`, {
          cache: 'no-store',
        });
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        const data = ct.includes('application/json')
          ? (() => {
              try {
                return JSON.parse(text);
              } catch {
                return null;
              }
            })()
          : null;

        if (!res.ok || !data) {
          throw new Error(
            `HTTP ${res.status} ${res.statusText} — ${text.slice(0, 300)}`,
          );
        }

        const o: Offer =
          (data as any).item ??
          (data as any).offer ??
          (Array.isArray(data) ? (data as any)[0] : data);

        setTitle(o.title ?? '');
        setDescription(o.description ?? '');
        setDtype(o.discountType ?? 'PERCENT');
        setDval(String(o.discountVal ?? 0));
        setStartAt(toLocalInput(o.startAt));
        setEndAt(toLocalInput(o.endAt));

        if (o.product) {
          setTarget('product');
          setProdSel(o.product);
        } else if (o.category) {
          setTarget('category');
          setCatSel(o.category);
        } else {
          setTarget('general');
        }
      } catch (e: any) {
        setErr(e?.message || 'No se pudo cargar la oferta');
      } finally {
        setLoading(false);
      }
    })();
  }, [offerId]);

  // búsqueda productos
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!prodQ.trim()) {
        setProdOpts([]);
        return;
      }
      try {
        const found = await fetchList<ProductOpt>([
          '/api/admin/search/products?q=' + encodeURIComponent(prodQ),
          '/api/admin/products?q=' + encodeURIComponent(prodQ),
          '/api/admin/productos?q=' + encodeURIComponent(prodQ),
        ]);
        setProdOpts(found);
      } catch {
        setProdOpts([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [prodQ]);

  // búsqueda categorías
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!catQ.trim()) {
        setCatOpts([]);
        return;
      }
      try {
        const found = await fetchList<CategoryOpt>([
          '/api/admin/search/categories?q=' + encodeURIComponent(catQ),
          '/api/admin/categories?q=' + encodeURIComponent(catQ),
          '/api/admin/categorias?q=' + encodeURIComponent(catQ),
        ]);
        setCatOpts(found);
      } catch {
        setCatOpts([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [catQ]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!offerId) return;
    setSaving(true);
    setErr(null);

    const payload: any = {
      title,
      description: description.trim() || null,
      discountType: dtype,
      discountVal: Number(dval || 0),
      startAt: startAt || null,
      endAt: endAt || null,
      productId: null,
      categoryId: null,
    };

    if (target === 'product' && prodSel) {
      payload.productId = prodSel.id;
    } else if (target === 'category' && catSel) {
      payload.categoryId = catSel.id;
    }

    try {
      const res = await fetch(`/api/admin/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResult;
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'No se pudo guardar la oferta');
      }
      router.push('/admin/ofertas');
    } catch (e: any) {
      setErr(e?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => {
    const val =
      dtype === 'PERCENT'
        ? `${Number(dval || 0)}%`
        : `$ ${Number(dval || 0).toFixed(2)}`;
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

  const canSubmit =
    title.trim().length > 0 &&
    Number.isFinite(Number(dval)) &&
    (target === 'general' ||
      (target === 'product' && !!prodSel) ||
      (target === 'category' && !!catSel));

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Editar oferta #{offerId || '—'}
        </h1>
        <button
          type="button"
          className="border rounded px-3 py-1"
          onClick={() => router.push('/admin/ofertas')}
        >
          ← Volver al listado
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {loading && <div className="text-sm opacity-70">Cargando…</div>}

      {!loading && (
        <form onSubmit={onSave} className="grid gap-2 md:grid-cols-6 border rounded p-4">
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
                        {p.name}{' '}
                        <span className="opacity-60">({p.slug})</span>
                      </button>
                    </li>
                  ))}
                  {!prodOpts.length && (
                    <li className="opacity-60">Sin resultados</li>
                  )}
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
                        {c.name}{' '}
                        <span className="opacity-60">({c.slug})</span>
                      </button>
                    </li>
                  ))}
                  {!catOpts.length && (
                    <li className="opacity-60">Sin resultados</li>
                  )}
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

          <div className="md:col-span-6 text-sm opacity-80">
            Vista previa: {preview}
          </div>

          <button
            className="border rounded px-4 py-2 md:col-span-6 w-fit disabled:opacity-50"
            type="submit"
            disabled={!canSubmit || saving}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </main>
  );
}
