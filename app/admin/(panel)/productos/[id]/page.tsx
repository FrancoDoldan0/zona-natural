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

  // 🆕 campos opcionales que puede traer la API admin
  hasVariants?: boolean;
  variants?: Array<{
    id: number;
    label: string;
    price: number | null;
    priceOriginal: number | null;
    sku: string | null;
    stock: number | null;
    sortOrder: number;
    active: boolean;
  }>;
};

const STATUS_OPTS: Status[] = ['ACTIVE', 'AGOTADO', 'INACTIVE', 'DRAFT', 'ARCHIVED'];

// 🆕 filas del editor (strings para inputs, se parsea al guardar)
type VariantRow = {
  id?: number;
  label: string;
  price: string;          // decimal como string
  priceOriginal: string;  // decimal como string
  sku: string;
  stock: string;          // entero como string
  sortOrder: number;
  active: boolean;
};

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

// 🆕 helpers parse
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

  // 🆕 variantes
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);

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

      // 🆕 inicializar variantes
      const hv = !!p?.hasVariants && Array.isArray(p?.variants);
      setHasVariants(hv);
      if (hv) {
        const mapped =
          (p.variants ?? [])
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .slice(0, 3)
            .map((v) => ({
              id: v.id,
              label: v.label ?? '',
              price: v.price != null ? String(v.price) : '',
              priceOriginal: v.priceOriginal != null ? String(v.priceOriginal) : '',
              sku: v.sku ?? '',
              stock: v.stock != null ? String(v.stock) : '',
              sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : 0,
              active: v.active !== false,
            })) as VariantRow[];
        setVariants(mapped);
      } else {
        setVariants([]);
      }
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

  // 🆕 editor variantes helpers
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
      return [...arr].sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const body: any = {
        name: name.trim(),
        // Si el slug se deja vacío, la API lo recalcula (mandamos slug: "")
        ...(slug.trim() !== '' ? { slug: slug.trim() } : { slug: '' }),
        description: description.trim() || null,
        // 🆕 si usamos variantes, no enviamos/forzamos null el price base
        price: hasVariants
          ? null
          : price.trim() === ''
            ? null
            : Number(price.replace(',', '.')),
        sku: sku.trim() || null,
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        subcategoryId: subcategoryId === '' ? null : Number(subcategoryId),

        // 🆕 flag
        hasVariants,
      };

      if (hasVariants) {
        if (!variants.length) {
          alert('Agregá al menos una variante o desactiva “Usar variantes de peso”.');
          return;
        }
        const normalized = variants
          .slice(0, 3)
          .map((v, idx) => ({
            id: v.id, // si existe, upsert; si no, create
            label: v.label.trim(),
            price: parseDecimalOrNull(v.price),
            priceOriginal: parseDecimalOrNull(v.priceOriginal),
            sku: v.sku.trim() || null,
            stock: parseIntOrNull(v.stock),
            sortOrder: Number.isFinite(v.sortOrder) ? v.sortOrder : idx,
            active: !!v.active,
          }))
          .filter((v) => v.label !== '');

        if (!normalized.length) {
          alert('Cada variante debe tener etiqueta (ej: “500 gr”).');
          return;
        }
        body.variants = normalized;
      } else {
        // al apagar variantes, la API borra las existentes (no mandamos array)
        delete body.variants;
      }

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
              disabled={hasVariants} // 🆕 deshabilitar si usamos variantes
              title={hasVariants ? 'Deshabilitado: el precio depende de la variante' : 'Precio base del producto'}
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

        {/* 🆕 Toggle variantes */}
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => setHasVariants(e.target.checked)}
          />
          <span>Usar variantes de peso (hasta 3)</span>
        </label>

        {/* 🆕 Editor de variantes */}
        {hasVariants && (
          <div className="mt-2 space-y-3">
            {variants.map((v, idx) => (
              <div key={v.id ?? `var-${idx}`} className="grid gap-2 rounded-lg border p-3">
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

        <button className="border rounded px-4 py-2" type="submit" disabled={loading}>
          {loading ? 'Cargando…' : 'Guardar cambios'}
        </button>
      </form>

      {err && <p className="text-sm text-red-600">Error: {err}</p>}
    </main>
  );
}
