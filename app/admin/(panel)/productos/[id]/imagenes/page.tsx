"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Img = { id: number; url: string; alt?: string | null; sortOrder?: number | null };
type ProductResp = { ok?: boolean; item?: { id: number; name: string; images?: Img[] } };

async function getProduct(id: number): Promise<ProductResp> {
  // intenta /products y cae a /productos
  let r = await fetch(`/api/admin/products/${id}`, { cache: "no-store" });
  if (!r.ok) r = await fetch(`/api/admin/productos/${id}`, { cache: "no-store" });
  return r.json();
}

export default function AdminProductImagesPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [name, setName] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");

  async function load() {
    const data = await getProduct(id);
    setName(data.item?.name ?? "");
    setImages(data.item?.images ?? []);
  }

  useEffect(() => {
    load().catch((e) => {
      console.error(e);
      alert("No pude cargar las imágenes.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    if (alt.trim()) fd.append("alt", alt.trim());
    // sortOrder por defecto: al final
    fd.append("sortOrder", String((images?.length ?? 0) + 1));

    let r = await fetch(`/api/admin/products/${id}/images`, { method: "POST", body: fd });
    if (!r.ok) r = await fetch(`/api/admin/productos/${id}/imagenes`, { method: "POST", body: fd });
    if (!r.ok) {
      const txt = await r.text();
      alert("No se pudo subir la imagen.\n" + txt);
      return;
    }
    setFile(null);
    setAlt("");
    await load();
  }

  async function onDelete(imageId: number) {
    if (!confirm("¿Eliminar imagen?")) return;
    let r = await fetch(`/api/admin/products/${id}/images?imageId=${imageId}`, { method: "DELETE" });
    if (!r.ok)
      r = await fetch(`/api/admin/productos/${id}/imagenes?imageId=${imageId}`, { method: "DELETE" });
    if (!r.ok) {
      const txt = await r.text();
      alert("No se pudo eliminar.\n" + txt);
      return;
    }
    await load();
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Imágenes — {name || `#${id}`}</h1>

      <div className="flex items-center gap-3">
        <Link href={`/admin/productos/${id}`} className="underline">
          ← Volver al editor
        </Link>
        <Link href="/admin/productos" className="underline">
          Listado
        </Link>
      </div>

      <form onSubmit={onUpload} className="border rounded p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="border rounded p-2"
          />
          <input
            className="border rounded p-2"
            placeholder="Alt (opcional)"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
          <button className="border rounded px-4 py-2" type="submit" disabled={!file}>
            Subir
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((im) => (
          <figure key={im.id} className="border rounded p-2">
            <img
              src={im.url?.startsWith("http") ? im.url : `/${im.url?.replace(/^\//, "")}`}
              alt={im.alt ?? ""}
              style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 6 }}
            />
            <figcaption className="text-xs mt-2 break-all">
              {im.alt || <span className="opacity-60">sin alt</span>}
            </figcaption>
            <button className="text-red-600 text-sm mt-2 underline" onClick={() => onDelete(im.id)}>
              Eliminar
            </button>
          </figure>
        ))}
        {!images.length && <p className="opacity-70">Sin imágenes.</p>}
      </div>
    </main>
  );
}
