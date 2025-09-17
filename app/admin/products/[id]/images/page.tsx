'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

type ProductImage = {
  id: number;
  productId: number;
  url: string;
  alt: string | null;
  sortOrder: number | null;
};

function getCsrf() {
  const m = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/** Intenta varias URLs hasta obtener 2xx + JSON válido */
async function fetchJsonTry(urls: string[], init?: RequestInit) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { ...init, cache: 'no-store' });
      const ct = r.headers.get('content-type') || '';
      const body = await r.text();
      const json = ct.includes('application/json')
        ? (() => { try { return JSON.parse(body); } catch { return null; } })()
        : null;

      if (!r.ok) {
        lastErr = new Error(
          `${init?.method || 'GET'} ${u} → ${r.status} ${r.statusText} — ${body?.slice(0, 200) || '(sin cuerpo)'}`
        );
        continue;
      }
      return json ?? body;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('No pude leer la API.');
}

/** URLs de imágenes */
const urls = {
  list: (id: number) => [
    `/api/admin/product-images?productId=${id}`,
    `/api/admin/products/images?productId=${id}`,
    `/api/admin/productos/imagenes?productId=${id}`,      // español (por query)
    `/api/admin/products/${id}/images`,                    // path EN
    `/api/admin/productos/${id}/imagenes`,                 // path ES
  ],
  upload: (id: number) => [
    `/api/admin/product-images?productId=${id}`,
    `/api/admin/products/images?productId=${id}`,
    `/api/admin/productos/imagenes?productId=${id}`,
    `/api/admin/products/${id}/images`,
    `/api/admin/productos/${id}/imagenes`,
  ],
  reorder: (id: number) => [
    `/api/admin/product-images/reorder?productId=${id}`,
    `/api/admin/products/images/reorder?productId=${id}`,
    `/api/admin/productos/imagenes/reordenar?productId=${id}`,
    `/api/admin/products/${id}/images/reorder`,
    `/api/admin/productos/${id}/imagenes/reordenar`,
  ],
  item: (id: number, imageId: number) => [
    `/api/admin/product-images/${imageId}?productId=${id}`,
    `/api/admin/products/images/${imageId}?productId=${id}`,
    `/api/admin/productos/imagenes/${imageId}?productId=${id}`,
    `/api/admin/products/${id}/images/${imageId}`,
    `/api/admin/productos/${id}/imagenes/${imageId}`,
  ],
};

export default function ImagesPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);
  const base = useMemo(() => '', []);
  const [items, setItems] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  // DnD
  const dragIndex = useRef<number | null>(null);
  const overIndex = useRef<number | null>(null);
  const [dirty, setDirty] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJsonTry(urls.list(productId).map((u) => `${base}${u}`), {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const arr: ProductImage[] =
        j?.items ?? j?.data ?? Array.isArray(j) ? j : [];

      setItems((arr as ProductImage[]).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(productId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function onDragStart(idx: number) {
    dragIndex.current = idx;
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    overIndex.current = idx;
  }
  function onDrop() {
    const from = dragIndex.current, to = overIndex.current;
    dragIndex.current = null;
    overIndex.current = null;
    if (from == null || to == null || from === to) return;
    setItems((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setDirty(true);
      return next;
    });
  }

  async function saveOrder() {
    setSaving(true);
    setError(null);
    try {
      const order = items.map((it) => it.id);
      const j = await fetchJsonTry(urls.reorder(productId).map((u) => `${base}${u}`), {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': getCsrf(),
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ order }),
      });
      const arr: ProductImage[] = j?.items ?? j?.data ?? [];
      setItems(arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function doMove(id: number, dir: 'up' | 'down') {
    setSavingId(id);
    setError(null);
    try {
      await fetchJsonTry(urls.item(productId, id).map((u) => `${base}${u}`), {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': getCsrf(),
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ move: dir }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function doAlt(id: number, newAlt: string) {
    setSavingId(id);
    setError(null);
    try {
      await fetchJsonTry(urls.item(productId, id).map((u) => `${base}${u}`), {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': getCsrf(),
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ alt: newAlt }),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function doDelete(id: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    setSavingId(id);
    setError(null);
    try {
      await fetchJsonTry(urls.item(productId, id).map((u) => `${base}${u}`), {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrf(), Accept: 'application/json' },
        credentials: 'include',
      });
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file, file.name);
      if (alt.trim()) fd.set('alt', alt.trim());

      await fetchJsonTry(urls.upload(productId).map((u) => `${base}${u}`), {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrf(), Accept: 'application/json' },
        credentials: 'include',
        body: fd,
      });

      setFile(null);
      setAlt('');
      const input = document.getElementById('fileInput') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Imágenes del producto #{productId}</h1>
        <button
          onClick={saveOrder}
          disabled={!dirty || saving}
          className="rounded px-4 py-2 bg-black text-white disabled:opacity-50"
          title={!dirty ? 'Sin cambios' : 'Guardar nuevo orden'}
        >
          {saving ? 'Guardando…' : 'Guardar orden'}
        </button>
      </div>

      <form onSubmit={doUpload} className="mb-6 grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <div className="grid gap-2">
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded border p-2"
            required
          />
          <input
            type="text"
            placeholder="Texto ALT (opcional)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="block w-full rounded border p-2"
            maxLength={200}
          />
        </div>
        <button
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={loading || !file}
        >
          {loading ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </form>

      {error && <div className="mb-4 text-sm text-red-600">Error: {error}</div>}

      {loading ? (
        <div>Cargando…</div>
      ) : (
        <ul className="grid gap-3">
          {items.map((it, idx) => (
            <li
              key={it.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={onDrop}
              className="border rounded p-3 flex items-center gap-4 bg-white"
            >
              <span className="cursor-move select-none px-2 py-1 border rounded">↕</span>

              <img src={it.url} alt={it.alt ?? ''} className="h-20 w-20 object-cover rounded" />

              <div className="flex-1">
                <div className="text-xs text-gray-500">
                  id={it.id} • sortOrder={it.sortOrder ?? '-'}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={it.alt ?? ''}
                    placeholder="ALT"
                    className="border rounded p-2 w-full"
                    onBlur={(e) => {
                      const val = e.currentTarget.value ?? '';
                      if ((it.alt ?? '') !== val) doAlt(it.id, val);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => doMove(it.id, 'up')}
                    disabled={savingId === it.id}
                    className="border rounded px-3 py-2"
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => doMove(it.id, 'down')}
                    disabled={savingId === it.id}
                    className="border rounded px-3 py-2"
                    title="Mover abajo"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => doDelete(it.id)}
                    disabled={savingId === it.id}
                    className="border rounded px-3 py-2 text-red-600"
                    title="Eliminar"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-gray-500">Sin imágenes aún.</li>}
        </ul>
      )}
    </main>
  );
}
