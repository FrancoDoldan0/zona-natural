// app/admin/(panel)/categorias/[id]/imagenes/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Img = {
  id?: number | null;        // puede no venir si listamos directo de R2
  key?: string;              // siempre viene en /images
  url: string;
  alt?: string | null;
  sortOrder?: number | null;
  isCover?: boolean | null;
  size?: number | null;
  createdAt?: string | null;
};

type Category = { id: number; name: string; slug?: string };

const PLACEHOLDER = '/placeholder.jpg';

/** Llama primero a /categories y, si no existe, a /categorias. Siempre con credenciales. */
async function callApi(pathEn: string, pathEs: string, init?: RequestInit) {
  const opts: RequestInit = { credentials: 'include', ...init };
  const r = await fetch(pathEn, opts);
  if (r.ok || r.status !== 404) return r;
  return fetch(pathEs, opts);
}

/** Intenta una lista de URLs hasta que alguna de OK (status 2xx) */
async function fetchUntilOk(urls: string[], init?: RequestInit) {
  let last: Response | null = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { credentials: 'include', ...init });
      if (r.ok) return r;
      last = r;
    } catch {}
  }
  if (last) return last;
  throw new Error('No se pudo contactar al servidor.');
}

export default function AdminCategoryImagesPage() {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Img[]>([]);
  const [error, setError] = useState('');

  // si alguna imagen tiene id => hay tabla; si ninguna tiene id => sólo R2 (sin DB)
  const canEditOrderAlt = useMemo(() => items.some((x) => x.id != null), [items]);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadAltRef = useRef<HTMLInputElement>(null);
  const dragSrcIndex = useRef<number | null>(null);

  const title = useMemo(
    () => (category ? `Imágenes — ${category.name}` : 'Imágenes'),
    [category],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1) Categoría (para título y links)
      {
        const r = await callApi(
          `/api/admin/categories/${id}`,
          `/api/admin/categorias/${id}`,
          { cache: 'no-store' },
        );
        if (!r.ok) throw new Error(`GET category ${id}: ${r.status}`);
        const data = await r.json<any>();
        const c = (data.item ?? data?.data ?? data) as Category;
        setCategory(c);
      }

      // 2) Imágenes (siempre desde el endpoint nuevo con fallback)
      {
        const r = await callApi(
          `/api/admin/categories/${id}/images`,
          `/api/admin/categorias/${id}/imagenes`,
          { cache: 'no-store' },
        );
        if (!r.ok) throw new Error(`GET images ${id}: ${r.status}`);
        const data = await r.json<any>();
        const imgs: Img[] = (data.items ?? data.images ?? []).slice();

        // normalizar orden: por sortOrder luego por createdAt
        imgs.sort((a, b) => {
          const sa = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const sb = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (sa !== sb) return sa - sb;
          const ca = a.createdAt ? Date.parse(a.createdAt) : 0;
          const cb = b.createdAt ? Date.parse(b.createdAt) : 0;
          return ca - cb;
        });

        setItems(imgs);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Upload ----------
  const doUpload = useCallback(
    async (files: FileList) => {
      if (!files?.length) return;
      setSaving(true);
      setError('');
      try {
        const altCommon = uploadAltRef.current?.value?.trim();
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append('file', files[i]); // backend espera "file"
          if (altCommon) fd.append('alt', altCommon);
          fd.append('sortOrder', String((items?.length ?? 0) + i));

          const r = await callApi(
            `/api/admin/categories/${id}/images`,
            `/api/admin/categorias/${id}/imagenes`,
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
    [id, items, load],
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
  async function onDelete(img: Img) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    setSaving(true);
    setError('');
    try {
      let r: Response;

      if (img.id != null) {
        // por id (DB)
        r = await fetchUntilOk(
          [
            `/api/admin/categories/${id}/images/${img.id}`,
            `/api/admin/categorias/${id}/imagenes/${img.id}`,
            `/api/admin/categories/images?categoryId=${id}&imageId=${img.id}`,
            `/api/admin/categorias/imagenes?categoryId=${id}&imageId=${img.id}`,
          ],
          { method: 'DELETE' },
        );
      } else if (img.key) {
        const enc = encodeURIComponent(img.key);
        // por key (R2-only)
        r = await fetchUntilOk(
          [
            `/api/admin/categories/${id}/images?key=${enc}`,
            `/api/admin/categorias/${id}/imagenes?key=${enc}`,
            `/api/admin/categories/imagenes?categoryId=${id}&key=${enc}`,
            `/api/admin/categorias/imagenes?categoryId=${id}&key=${enc}`,
          ],
          { method: 'DELETE' },
        );
      } else {
        throw new Error('No hay id ni key para borrar la imagen.');
      }

      if (!r.ok) throw new Error(`DELETE: ${r.status}`);
      // Optimista
      setItems((prev) =>
        prev.filter((x) => (img.id != null ? x.id !== img.id : x.key !== img.key)),
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---------- Reordenar (sólo si hay IDs/DB) ----------
  async function persistOrder(newItems: Img[]) {
    if (!canEditOrderAlt) {
      setError('No se puede reordenar sin IDs de imágenes (modo sólo R2).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const ids = newItems.map((x) => x.id!).filter((x) => x != null);

      // Intento masivo
      let r = await callApi(
        `/api/admin/categories/${id}/images/reorder`,
        `/api/admin/categorias/${id}/imagenes/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desiredIds: ids }),
        },
      );

      // Fallback: uno por uno si el masivo no existe
      if (r.status === 404) {
        for (let i = 0; i < newItems.length; i++) {
          const imgId = newItems[i].id!;
          r = await callApi(
            `/api/admin/categories/${id}/images/${imgId}`,
            `/api/admin/categorias/${id}/imagenes/${imgId}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: i }),
            },
          );
          if (!r.ok) throw new Error(`PATCH sortOrder(${imgId}): ${r.status}`);
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
    if (!canEditOrderAlt) return;
    dragSrcIndex.current = i;
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!canEditOrderAlt) return;
    e.preventDefault();
  }
  function onDrop(i: number) {
    if (!canEditOrderAlt) return;
    const from = dragSrcIndex.current;
    dragSrcIndex.current = null;
    if (from == null || from === i) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(i, 0, m);
    persistOrder(next);
  }

  // “Hacer portada”: usa PATCH isCover (o reordenamiento como fallback)
  async function makeCover(ix: number) {
    if (!canEditOrderAlt) {
      setError('No se puede marcar portada sin IDs (modo sólo R2).');
      return;
    }
    if (ix === 0) return;
    const img = items[ix];
    setSaving(true);
    setError('');
    try {
      let r = await callApi(
        `/api/admin/categories/${id}/images/${img.id}`,
        `/api/admin/categorias/${id}/imagenes/${img.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCover: true }),
        },
      );
      // Fallback: reordenar local si PATCH no existe
      if (r.status === 404) {
        const next = items.slice();
        const [m] = next.splice(ix, 1);
        next.unshift(m);
        await persistOrder(next);
        return;
      }
      if (!r.ok) throw new Error(`PATCH isCover: ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---------- ALT ----------
  async function saveAlt(img: Img, alt: string) {
    if (!canEditOrderAlt || img.id == null) {
      setError('No se puede actualizar ALT sin IDs (modo sólo R2).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const r = await callApi(
        `/api/admin/categories/${id}/images/${img.id}`,
        `/api/admin/categorias/${id}/imagenes/${img.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alt }),
        },
      );
      if (!r.ok) throw new Error(`PATCH alt: ${r.status}`);
      setItems((prev) => prev.map((x) => (x.id === img.id ? { ...x, alt } : x)));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI ----------
  const tiendaHref =
    category?.slug
      ? `/catalogo?category=${encodeURIComponent(category.slug)}`
      : `/catalogo?categoryId=${category?.id}`;

  return (
    <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-gray-500">
            {items.length
              ? `${items.length} imagen${items.length === 1 ? '' : 'es'} en total`
              : 'Gestioná las imágenes de la categoría'}
          </p>
          {!canEditOrderAlt && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-2 inline-block">
              Mostrando desde R2 (sin registros en DB): podés subir y borrar, pero no reordenar, marcar
              portada ni editar ALT.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50 transition"
            href={`/admin/categorias`}
          >
            <span>←</span> Volver a categorías
          </Link>
          {category && (
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700 transition"
              target="_blank"
              href={tiendaHref}
            >
              Ver en tienda ↗
            </Link>
          )}
        </div>
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
          Tip: Si más adelante habilitás metadata en DB, vas a poder reordenar, marcar portada y editar ALT.
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          Cargando…
        </div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-gray-600 bg-white">
          Aún no hay imágenes.
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {items.map((im, i) => (
            <div
              key={im.id ?? im.key ?? `${im.url}-${i}`}
              className={`relative rounded-2xl border bg-white shadow-sm transition overflow-hidden group ${
                canEditOrderAlt ? 'hover:shadow-md' : ''
              }`}
              draggable={canEditOrderAlt}
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              title={canEditOrderAlt ? 'Arrastrá para reordenar' : 'Reordenar deshabilitado'}
            >
              <div className="aspect-[4/3] bg-gray-100">
                <img
                  src={im.url?.startsWith('http') || im.url?.startsWith('/') ? im.url : `/${im.url}`}
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
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow">Portada</span>
                ) : canEditOrderAlt ? (
                  <button
                    className="px-2 py-0.5 rounded-full bg-gray-900/80 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    onClick={() => makeCover(i)}
                  >
                    Hacer portada
                  </button>
                ) : null}
              </div>

              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">#{i + 1}</span>
                  <button
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs hover:bg-red-100 transition"
                    onClick={() => onDelete(im)}
                  >
                    Eliminar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] tracking-wide uppercase text-gray-500">Texto ALT</label>
                  <input
                    defaultValue={im.alt ?? ''}
                    placeholder={canEditOrderAlt ? 'Descripción accesible' : 'No disponible en modo R2'}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:bg-gray-50"
                    disabled={!canEditOrderAlt || im.id == null}
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (!canEditOrderAlt || im.id == null) return;
                      if (v !== (im.alt ?? '')) saveAlt(im, v);
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          Guardando cambios…
        </div>
      )}
    </main>
  );
}
