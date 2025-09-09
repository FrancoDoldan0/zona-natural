'use client';

import { useEffect, useRef, useState } from 'react';

type Img = { id: number; url: string; alt?: string | null; sortOrder?: number | null };
type Props = { productId: number; slug: string; name?: string };

/** Respuesta pública mínima del producto (solo lo que usa este componente) */
type PublicProduct = { images?: Img[] };

/** Unions de API usadas por el fetch */
type ApiItem<T> =
  | { ok: true; item: T }
  | { ok: false; error: string };

type ApiOk =
  | { ok: true }
  | { ok: false; error: string };

export default function ProductImagesManager({ productId, slug, name }: Props) {
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch(`/api/public/producto/${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`GET /public/producto/${slug} -> ${res.status}`);

      // ✅ Tipado correcto: la API puede devolver { ok, item } o el objeto plano
      const data = await res.json<PublicProduct | ApiItem<PublicProduct>>();

      let item: PublicProduct;
      if ('ok' in data) {
        if (!data.ok) throw new Error(data.error || 'Error de API');
        item = data.item;
      } else {
        item = data;
      }

      setImages(Array.isArray(item?.images) ? item.images : []);
    } catch (e: any) {
      setErr(e?.message ?? 'Error al cargar imágenes');
      setImages([]);
    }
  }

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: fd,
      });
      // (opcional) si tu endpoint devuelve { ok: boolean }, podrías validar:
      // const j = await res.json<ApiOk>();
      if (!res.ok) throw new Error(`POST /images -> ${res.status}`);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Error al subir imagen');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(imageId: number) {
    if (!confirm('¿Eliminar imagen?')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images?imageId=${imageId}`, {
        method: 'DELETE',
      });
      // (opcional) si tu endpoint devuelve { ok: boolean }, podrías validar:
      // const j = await res.json<ApiOk>();
      if (!res.ok) throw new Error(`DELETE /images -> ${res.status}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Error al eliminar imagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginTop: 8 }}>
      <strong>Imágenes de “{name ?? slug}”</strong>

      <form
        onSubmit={handleUpload}
        style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input ref={fileRef} type="file" accept="image/*" />
        <button disabled={busy} type="submit">
          Subir
        </button>
      </form>

      {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
          marginTop: 10,
        }}
      >
        {images.length === 0 && <em>Sin imágenes.</em>}

        {images.map((img) => (
          <figure key={img.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
            {/* Usamos <img> directo para simplificar el admin */}
            <img
              src={img.url}
              alt={img.alt ?? name ?? slug}
              style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }}
            />
            <figcaption
              style={{
                fontSize: 12,
                color: '#555',
                marginTop: 6,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>ID: {img.id}</span>
              <button
                disabled={busy}
                onClick={() => handleDelete(img.id)}
                style={{ color: 'crimson' }}
              >
                borrar
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
