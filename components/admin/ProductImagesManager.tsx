"use client";

import { useEffect, useRef, useState } from "react";

type Img = { id: number; url: string; alt?: string | null; sortOrder?: number | null };
type Props = { productId: number; slug: string; name?: string };

export default function ProductImagesManager({ productId, slug, name }: Props) {
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    try {
      setErr(null);
      const res = await fetch(`/api/public/producto/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`GET /public/producto/${slug} -> ${res.status}`);
      const json = await res.json();
      const item = json.item ?? json;
      setImages(Array.isArray(item?.images) ? item.images : []);
    } catch (e: any) {
      setErr(e?.message ?? "Error al cargar imágenes");
    }
  }

  useEffect(() => { load(); }, [slug]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`POST /images -> ${res.status}`);
      fileRef.current!.value = "";
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error al subir imagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(imageId: number) {
    if (!confirm("¿Eliminar imagen?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images?imageId=${imageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /images -> ${res.status}`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Error al eliminar imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 8 }}>
      <strong>Imágenes de “{name ?? slug}”</strong>
      <form onSubmit={handleUpload} style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" />
        <button disabled={busy} type="submit">Subir</button>
      </form>
      {err && <p style={{ color: "crimson", marginTop: 8 }}>{err}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
        {images.length === 0 && <em>Sin imágenes.</em>}
        {images.map(img => (
          <figure key={img.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
            {/* Usamos <img> directo para simplificar el admin */}
            <img
              src={img.url}
              alt={img.alt ?? name ?? slug}
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }}
            />
            <figcaption style={{ fontSize: 12, color: "#555", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
              <span>ID: {img.id}</span>
              <button disabled={busy} onClick={() => handleDelete(img.id)} style={{ color: "crimson" }}>
                borrar
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
