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
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'INACTIVE' | 'AGOTADO' | string;
  categoryId: number | null;
  subcategoryId: number | null;
  category?: { id: number; name: string } | null;
  subcategory?: { id: number; name: string } | null;
};

// 🆕 Variantes (para el mini-form de creación)
type VariantRow = {
  id?: number; // no se usa al crear, pero lo dejamos por compat
  label: string;
  price: string;          // lo guardamos como string y lo parseamos al enviar
  priceOriginal: string;  // idem
  sku: string;
  stock: string;          // entero (string → int)
  sortOrder: number;
  active: boolean;
};

const DEFAULT_LIMIT = 20;

/** Fallback: primero prueba /products y si no, /productos */
async function callApi(pathEn: string, pathEs: string, init?: RequestInit) {
  const baseInit: RequestInit = {
    ...init,
    cache: 'no-store',
    // Next/fetch en el cliente ya usa credentials:"same-origin" por defecto
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
      ...(init?.method && init.method.toUpperCase() !== 'GET'
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  };
  const resEn = await fetch(pathEn, baseInit);
  if (resEn.ok || resEn.status !== 404) return resEn;
  // Si 404 puntual, probamos la variante /productos
  return fetch(pathEs, baseInit);
}

/** Lee la respuesta de forma segura. Si no es JSON, devuelve el texto crudo */
async function readJsonSafe(res: Response): Promise<{ json: any | null; text: string; ctype: string }> {
  const ct = res.headers.get('content-type') || '';
  const body = await res.text();
  if (ct.includes('application/json')) {
    try {
      return { json: JSON.parse(body), text: body, ctype: ct };
    } catch {
      // sigue abajo con texto crudo
    }
  }
  return { json: null, text: body, ctype: ct };
}

/** Mensajes de error legibles para el panel */
function formatApiError(res: Response, json: any, text: string) {
  // sesión expirada / login requerido
  const redirectedToLogin =
    (res.redirected && /\/admin\/login/.test(res.url)) ||
    /\/admin\/login/.test(text) ||
    res.status === 401 || res.status === 403;

  if (redirectedToLogin) {
    return 'Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión en el panel.';
  }

  // Errores del handler de Products
  const code = json?.error as string | undefined;

  if (res.status === 409 && (code === 'slug_taken' || code === 'unique_constraint')) {
    const slug = json?.slug ?? json?.field ?? 'slug';
    return `El ${slug === 'slug' ? 'slug' : String(slug)} ya existe. Cambiá el nombre o definí un slug distinto.`;
  }

  if (code === 'category_not_found') {
    return `La categoría indicada no existe (id: ${json?.detail?.categoryId}).`;
  }
  if (code === 'subcategory_not_found') {
    return `La subcategoría indicada no existe (id: ${json?.detail?.subcategoryId}).`;
  }
  if (code === 'subcategory_mismatch') {
    const d = json?.detail || {};
    return `La subcategoría ${d.subcategoryId} pertenece a la categoría ${d.categoryIdOfSub}, no a ${d.categoryIdProvided}.`;
  }
  if (code === 'validation_failed') {
    return 'Los datos enviados no son válidos. Revisá nombre, precio y selecciones.';
  }

  // fallback con contexto
  const short = text ? text.slice(0, 500) : '(sin cuerpo)';
  return `HTTP ${res.status} ${res.statusText} — ${short}`;
}

// 🆕 helpers para parsear números
function parseDecimalOrNull(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function parseIntOrNull(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
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

  // paginación
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  // form crear
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'INACTIVE' | 'AGOTADO'>(
    'ACTIVE',
  );
  const [cId, setCId] = useState<number | ''>('');
  const [sId, setSId] = useState<number | ''>('');

  // 🆕 Estado de variantes para creación rápida
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  async function loadCats() {
    const res = await fetch('/api/admin/categories?take=999', { cache: 'no-store' });
    const data = await res.json<any>().catch(() => ({}));
    if (data?.ok) setCats(data.items);
  }
  async function loadSubs() {
    const res = await fetch('/api/admin/subcategories?take=999', { cache: 'no-store' });
    const data = await res.json<any>().catch(() => ({}));
    if (data?.ok) setSubs(data.items);
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
      const { json, text } = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(formatApiError(res, json, text));
      }
      if (!json?.ok) {
        throw new Error(json?.error || 'API error');
      }

      const list: Product[] =
        (json as any).items ?? (json as any).data ?? (json as any).rows ?? [];

      const count = typeof (json as any).total === 'number' ? (json as any).total : list.length;

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
  }, [limit, offset]);

  // 🆕 Variants editor helpers
  const canAddVariant = variants.length < 3;
  function addVariant() {
    if (!canAddVariant) return;
    setVariants((prev) => [
      ...prev,
      {
        label: '',
        price: '',
        priceOriginal: '',
        sku: '',
        stock: '',
        sortOrder: prev.length,
        active: true,
      },
    ]);
  }
  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((prev) => {
      const arr = [...prev];
      arr[i] = { ...arr[i], ...patch };
      return arr;
    });
  }
  function removeVariant(i: number) {
    setVariants((prev) => {
      const arr = prev.filter((_, idx) => idx !== i).map((v, idx) => ({ ...v, sortOrder: idx }));
      return arr;
    });
  }
  function moveVariant(i: number, dir: -1 | 1) {
    setVariants((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      const tmp = arr[i].sortOrder;
      arr[i].sortOrder = arr[j].sortOrder;
      arr[j].sortOrder = tmp;
      // reordenar físicamente para que el render siga el sortOrder
      const sorted = [...arr].sort((a, b) => a.sortOrder - b.sortOrder);
      return sorted;
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const body: any = { name: name.trim(), status };

      // descripción
      if (description.trim() !== '') body.description = description.trim();

      // precio (deshabilitado si hay variantes, pero si el user lo dejó escrito no lo mandamos)
      if (!hasVariants && price.trim() !== '') {
        // Permite "234,50"
        const n = Number(price.replace(',', '.'));
        if (!Number.isFinite(n)) throw new Error('Precio inválido. Usá números (ej: 199.90).');
        body.price = n;
      }

      if (sku.trim() !== '') body.sku = sku.trim();
      if (cId !== '') body.categoryId = Number(cId);
      if (sId !== '') body.subcategoryId = Number(sId);

      // 🆕 variantes
      if (hasVariants) {
        if (!variants.length) {
          throw new Error('Agregá al menos una variante o desactiva “Usar variantes de peso”.');
        }
        const normalized = variants
          .slice(0, 3)
          .map((v, idx) => ({
            label: v.label.trim(),
            price: parseDecimalOrNull(v.price),
            priceOriginal: parseDecimalOrNull(v.priceOriginal),
            sku: v.sku.trim() || null,
            stock: parseIntOrNull(v.stock),
            sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : idx,
            active: !!v.active,
          }))
          .filter((v) => v.label !== ''); // label obligatorio

        if (!normalized.length) {
          throw new Error('Cada variante debe tener etiqueta (ej: “500 gr”).');
        }

        body.hasVariants = true;
        body.variants = normalized;
      } else {
        body.hasVariants = false;
      }

      const res = await callApi('/api/admin/products', '/api/admin/productos', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const { json, text } = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(formatApiError(res, json, text));
      }
      if (!json?.ok) {
        // errores lógicos devueltos por la API con ok=false
        throw new Error(formatApiError(res, json, text));
      }

      // limpiar
      setName('');
      setDescription('');
      setPrice('');
      setSku('');
      setCId('');
      setSId('');
      setStatus('ACTIVE');

      // 🆕 limpiar variantes
      setHasVariants(false);
      setVariants([]);

      // recargar
      setOffset(0);
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error al crear producto');
    }
  }

  async function onDelete(id: number) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
      const res = await callApi(`/api/admin/products/${id}`, `/api/admin/productos/${id}`, {
        method: 'DELETE',
      });
      const { json, text } = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(formatApiError(res, json, text));
      }
      if (!json?.ok) {
        throw new Error(json?.error || 'No se pudo borrar');
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      alert(e?.message || 'No se pudo borrar');
    }
  }

  const page = Math.floor(offset / limit) + 1;

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
            disabled={hasVariants} // 🆕 deshabilitar si hay variantes
            title={hasVariants ? 'Deshabilitado: usando variantes' : 'Precio del producto'}
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
            <option value="INACTIVE">INACTIVE</option>
            <option value="AGOTADO">AGOTADO</option>
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

        {/* 🆕 Toggle variantes */}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              setHasVariants(e.target.checked);
              if (!e.target.checked) {
                // al apagar, mantenemos lo ingresado por si lo vuelven a activar
                // no limpiamos automáticamente variants
              }
            }}
          />
          <span>Usar variantes de peso (hasta 3)</span>
        </label>

        {/* 🆕 Mini-form variantes */}
        {hasVariants && (
          <div className="mt-2 space-y-3">
            {variants.map((v, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <strong>Variante #{idx + 1}</strong>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveVariant(idx, -1)}
                      disabled={idx === 0}
                      className="px-2 py-1 border rounded"
                      title="Subir"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveVariant(idx, 1)}
                      disabled={idx === variants.length - 1}
                      className="px-2 py-1 border rounded"
                      title="Bajar"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="px-2 py-1 border rounded text-red-600"
                      title="Eliminar variante"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <input
                    className="border rounded p-2 md:col-span-2"
                    placeholder='Label (ej. "500 gr")'
                    value={v.label}
                    onChange={(e) => updateVariant(idx, { label: e.target.value })}
                    required
                  />
                  <input
                    className="border rounded p-2"
                    placeholder="Precio (ej. 199.90)"
                    inputMode="decimal"
                    value={v.price}
                    onChange={(e) => updateVariant(idx, { price: e.target.value })}
                  />
                  <input
                    className="border rounded p-2"
                    placeholder="Precio original (opcional)"
                    inputMode="decimal"
                    value={v.priceOriginal}
                    onChange={(e) => updateVariant(idx, { priceOriginal: e.target.value })}
                  />
                  <input
                    className="border rounded p-2"
                    placeholder="SKU (opcional)"
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                  />
                  <input
                    className="border rounded p-2"
                    placeholder="Stock (opcional)"
                    inputMode="numeric"
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, { stock: e.target.value })}
                  />
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={v.active}
                    onChange={(e) => updateVariant(idx, { active: e.target.checked })}
                  />
                  <span>Activo</span>
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addVariant}
              disabled={!canAddVariant}
              className="px-3 py-2 border rounded disabled:opacity-50"
              title={canAddVariant ? 'Agregar variante' : 'Máximo 3 variantes'}
            >
              Añadir variante ({variants.length}/3)
            </button>
          </div>
        )}

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
                  <td className="p-2 border">
                    {p.status === 'AGOTADO' ? (
                      <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs">
                        AGOTADO
                      </span>
                    ) : (
                      p.status
                    )}
                  </td>
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
          {total > 0
            ? `Mostrando ${items.length} de ${total} (p. ${page}/${Math.max(
                1,
                Math.ceil(total / limit),
              )})`
            : '—'}
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
