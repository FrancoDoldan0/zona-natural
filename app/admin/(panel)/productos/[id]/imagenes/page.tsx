'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Img = { id: number; url: string; alt?: string | null; sortOrder?: number | null };
type Product = { id: number; name: string; slug: string; images?: Img[] };

const PLACEHOLDER = '/placeholder.jpg';

/** Llama primero a /products y, si no existe, a /productos */
async function callApi(pathProducts: string, pathProductos: string, init?: RequestInit) {
  let r = await fetch(pathProducts, init);
  if (r.ok || r.status !== 404) return r;
  return fetch(pathProductos, init);
}

export default function AdminProductImagesPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<Img[]>([]);
  const [error, setError] = useState('');

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadAltRef = useRef<HTMLInputElement>(null);
  const dragSrcIndex = useRef<number | null>(null);

  const title = useMemo(() => (product ? `Imágenes — ${product.name}` : 'Imágenes'), [product]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await callApi(`/api/admin/products/${id}`, `/api/admin/productos/${id}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`GET product ${id}: ${res.status}`);
      const data = await res.json<any>();
      const p: Product = data.item ?? data?.data ?? data;
      setProduct(p);
      const imgs = (p.images ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setItems(imgs);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- Upload (soporta múltiples: 1 POST por archivo con campo "file") ----------
  const doUpload = useCallback(
    async (files: FileList) => {
      if (!files?.length) return;
      setSaving(true);
      setError('');
      try {
        const altCommon = uploadAltRef.current?.value?.trim();
        // subimos uno por uno usando "file"
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append('file', files[i]); // <- TU BACKEND espera "file"
          if (altCommon) fd.append('alt', altCommon);
          // por si tu backend lo usa:
          fd.append('sortOrder', String((items?.length ?? 0) + i + 1));

          let r = await callApi(
            `/api/admin/products/${id}/images`,
            `/api/admin/productos/${id}/imagenes`,
            { method: 'POST', body: fd },
          );
          if (!r.ok) {
            const t = await r.text();
            throw new Error(`Upload: ${r.status} ${t}`);
          }
        }
        await load();
        if (uploadInputRef.current) uploadInputRef.current.value = '';
        if (uploadAltRef.current) uploadAltRef.current.value = '';
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setSaving(false);
      }
    },
    [id, items],
  );

  const onDropFiles = useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      const files = ev.dataTransfer.files;
      if (files && files.length) doUpload(files);
    },
    [doUpload],
  );

  // ---------- Delete ----------
  async function onDelete(imgId: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    setSaving(true);
    setError('');
    try {
      // intentamos estilo REST /:id y caemos a ?imageId=
      let r = await callApi(
        `/api/admin/products/${id}/images/${imgId}`,
        `/api/admin/productos/${id}/imagenes/${imgId}`,
        { method: 'DELETE' },
      );
      if (r.status === 404) {
        r = await callApi(
          `/api/admin/products/${id}/images?imageId=${imgId}`,
          `/api/admin/productos/${id}/imagenes?imageId=${imgId}`,
          { method: 'DELETE' },
        );
      }
      if (!r.ok) throw new Error(`DELETE: ${r.status}`);
      setItems((prev) => prev.filter((x) => x.id !== imgId));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---------- Reordenar ----------
  async function persistOrder(newItems: Img[]) {
    setSaving(true);
    setError('');
    try {
      // 1) endpoint masivo
      const ids = newItems.map((x) => x.id);
      let r = await callApi(
        `/api/admin/products/${id}/images/reorder`,
        `/api/admin/productos/${id}/imagenes/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
      );
      // 2) fallback: actualizar uno por uno si el masivo no existe
      if (r.status === 404) {
        for (let i = 0; i < newItems.length; i++) {
          const imgId = newItems[i].id;
          r = await callApi(
            `/api/admin/products/${id}/images/${imgId}`,
            `/api/admin/productos/${id}/imagenes/${imgId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: i + 1 }),
            },
          );
          if (!r.ok) throw new Error(`PUT sortOrder(${imgId}): ${r.status}`);
        }
      } else if (!r.ok) {
        const t = await r.text();
        throw new Error(`Reorder: ${r.status} ${t}`);
      }
      setItems(newItems);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function onDragStart(i: number) {
    dragSrcIndex.current = i;
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }
  function onDrop(i: number) {
    const from = dragSrcIndex.current;
    dragSrcIndex.current = null;
    if (from == null || from === i) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(i, 0, m);
    persistOrder(next);
  }

  // “Hacer portada”: llevar al índice 0 y persistir
  function makeCover(ix: number) {
    if (ix === 0) return;
    const next = items.slice();
    const [m] = next.splice(ix, 1);
    next.unshift(m);
    persistOrder(next);
  }

  // ---------- ALT ----------
  async function saveAlt(imgId: number, alt: string) {
    setSaving(true);
    setError('');
    try {
      const r = await callApi(
        `/api/admin/products/${id}/images/${imgId}`,
        `/api/admin/productos/${id}/imagenes/${imgId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alt }),
        },
      );
      if (!r.ok) throw new Error(`PUT alt: ${r.status}`);
      setItems((prev) => prev.map((x) => (x.id === imgId ? { ...x, alt } : x)));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI ----------
  return (
    <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500">
            {items.length
              ? `${items.length} imagen${items.length === 1 ? '' : 'es'} en total`
              : 'Gestioná las imágenes del producto'}
          </p>
        </div>

        {product && (
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50 transition"
              href={`/admin/productos/${product.id}`}
            >
              <span>←</span> Volver al editor
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 transition"
              target="_blank"
              href={`/productos/${product.slug}`}
            >
              Ver en tienda ↗
            </Link>
          </div>
        )}
      </div>

      {/* Zona de drop / subida */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropFiles}
        className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition p-6 sm:p-8 text-center"
      >
        <div className="mx-auto mb-3 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 opacity-70">
            <path
              d="M7 20h10a4 4 0 0 0 0-8h-.26A8 8 0 1 0 4 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 12v9m0-9l-3 3m3-3l3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
        <p className="mb-1 font-medium">Arrastrá y soltá imágenes aquí</p>
        <p className="text-sm text-gray-500 mb-4">o seleccioná desde tu equipo</p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.currentTarget.files && doUpload(e.currentTarget.files)}
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white hover:file:bg-emerald-700 file:cursor-pointer"
          />
          <input
            ref={uploadAltRef}
            type="text"
            placeholder="ALT (opcional para esta subida)"
            className="border rounded-full px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <p className="text-xs mt-3 text-gray-500">
          Tip: Podés editar el ALT de cada imagen, reordenar con drag & drop y marcar portada.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-3 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 0 1 8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          Cargando…
        </div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-gray-600 bg-white">
          Aún no hay imágenes.
        </div>
      ) : (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        >
          {items.map((im, i) => (
            <div
              key={im.id}
              className="relative rounded-2xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden group"
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              title="Arrastrá para reordenar"
            >
              <div className="aspect-[4/3] bg-gray-100">
                <img
                  src={
                    im.url?.startsWith('http') || im.url?.startsWith('/') ? im.url : `/${im.url}`
                  }
                  alt={im.alt ?? ''}
                  className="w-full h-full object-cover block"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.dataset.fallback === '1') return;
                    img.dataset.fallback = '1';
                    img.src = PLACEHOLDER;
                  }}
                />
              </div>

              {/* badge portada / acción hacer portada */}
              <div className="absolute top-2 left-2 text-xs">
                {i === 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow">
                    Portada
                  </span>
                ) : (
                  <button
                    className="px-2 py-0.5 rounded-full bg-gray-900/80 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    onClick={() => makeCover(i)}
                  >
                    Hacer portada
                  </button>
                )}
              </div>

              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">#{i + 1}</span>
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs hover:bg-red-100 transition"
                    onClick={() => onDelete(im.id)}
                  >
                    Eliminar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] tracking-wide uppercase text-gray-500">
                    Texto ALT
                  </label>
                  <input
                    defaultValue={im.alt ?? ''}
                    placeholder="Descripción accesible"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v !== (im.alt ?? '')) saveAlt(im.id, v);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 rounded-xl bg-gray-900 text-white shadow-lg px-3 py-2 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 0 1 8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          Guardando cambios…
        </div>
      )}
    </main>
  );
}
