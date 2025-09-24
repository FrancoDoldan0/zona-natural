'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

/** ==== Tipos R2 ==== */
type R2Item = {
  key: string;
  url: string;             // URL pública resuelta en el API (publicR2Url)
  size?: number;
  uploaded?: string;
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
      const r = await fetch(u, { ...init, cache: 'no-store', credentials: 'include' });
      const ct = r.headers.get('content-type') || '';
      const text = await r.text();
      const json = ct.includes('application/json')
        ? (() => { try { return JSON.parse(text); } catch { return null; } })()
        : null;

      if (!r.ok) {
        lastErr = new Error(
          `${init?.method || 'GET'} ${u} → ${r.status} ${r.statusText} — ${text?.slice(0, 200) || '(sin cuerpo)'}`
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

/** Endpoints (modo R2) */
const urls = {
  /** Lista objetos bajo products/<id>/ */
  list: (id: number) => [
    `/api/admin/uploads?productId=${id}`,            // recomendado
    `/api/admin/uploads?prefix=${encodeURIComponent(`products/${id}/`)}`, // fallback
  ],
  /** Subida */
  upload: `/api/admin/uploads`,
  /** Borrado por key */
  del: (key: string) => [
    `/api/admin/uploads?key=${encodeURIComponent(key)}`,
  ],
};

export default function ImagesPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const [items, setItems] = useState<R2Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState(''); // guardado “a futuro”: hoy no hay DB para ALT

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prefix = useMemo(() => `products/${productId}/`, [productId]);

  async function load() {
    if (!Number.isFinite(productId)) return;
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJsonTry(urls.list(productId), {
        headers: { Accept: 'application/json' },
      });

      const arr: R2Item[] = j?.items ?? j?.data ?? [];
      // Ordenar por nombre (simula “sortOrder” asc)
      arr.sort((a, b) => a.key.localeCompare(b.key));
      setItems(arr);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file, file.name);
      fd.set('productId', String(productId));
      if (alt.trim()) fd.set('alt', alt.trim()); // hoy no se persiste, pero ya lo mandamos

      await fetchJsonTry([urls.upload], {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrf(), Accept: 'application/json' },
        body: fd,
      });

      // reset
      setFile(null);
      setAlt('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function doDelete(key: string) {
    if (!confirm('¿Eliminar esta imagen de R2?')) return;
    setLoading(true);
    setError(null);
    try {
      await fetchJsonTry(urls.del(key), {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrf(), Accept: 'application/json' },
      });
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Imágenes — Producto #{productId}</h1>
        <a
          className="rounded px-3 py-2 border"
          href={`/productos/${productId}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver en tienda →
        </a>
      </div>

      <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        Mostrando desde <b>R2</b> (sin registros en DB): podés subir y borrar. <br />
        No hay reordenar/portada/ALT hasta que migremos a tabla <code>ProductImage</code>.
      </p>

      <form onSubmit={doUpload} className="mb-6 grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <div className="grid gap-2">
          <input
            ref={fileInputRef}
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded border p-2"
            required
          />
          <input
            type="text"
            placeholder="Texto ALT (opcional, no se guarda todavía)"
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
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">Sin imágenes aún en <code>{prefix}</code>.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((it) => (
            <li key={it.key} className="border rounded p-3 bg-white flex flex-col gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded bg-gray-50 border">
                <img
                  src={it.url?.startsWith('http') || it.url?.startsWith('/')
                    ? it.url
                    : `/${it.url}`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="text-xs text-gray-600 break-all">
                <div className="font-mono">{it.key}</div>
                {typeof it.size === 'number' && (
                  <div>{(it.size / 1024).toFixed(1)} KB</div>
                )}
                {it.uploaded && <div>Subida: {new Date(it.uploaded).toLocaleString()}</div>}
              </div>

              <div className="flex gap-2 mt-1">
                <a
                  href={it.url}
                  className="px-3 py-2 border rounded text-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir
                </a>
                <button
                  type="button"
                  onClick={() => doDelete(it.key)}
                  className="px-3 py-2 border rounded text-sm text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
