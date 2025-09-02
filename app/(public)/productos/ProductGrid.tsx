// app/(public)/productos/ProductGrid.tsx
"use client";

import Link from "next/link";
import type { Product } from "./page";

export default function ProductGrid({ items }: { items: Product[] }) {
  if (!items?.length) {
    return <p style={{ opacity: 0.7 }}>No hay productos para mostrar.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {items.map((p) => {
        // Catálogo: p.cover   | Detalle: p.coverUrl o p.images[0].url
        const firstImage =
          p.cover || p.coverUrl || p.images?.[0]?.url || "/placeholder.jpg";

        // Normalizar a ruta válida
        const src =
          firstImage?.startsWith("http") || firstImage?.startsWith("/")
            ? (firstImage as string)
            : `/${firstImage}`;

        // Precio a mostrar
        const displayPrice =
          typeof p.price === "number"
            ? p.price
            : typeof p.priceFinal === "number"
            ? p.priceFinal
            : typeof p.priceOriginal === "number"
            ? p.priceOriginal
            : null;

        return (
          <article
            key={p.id}
            style={{
              border: "1px solid #2b2b2b",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Link href={`/productos/${p.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", marginBottom: 8 }}>
                {/* IMG con fallback a /placeholder.jpg (solo en cliente) */}
                <img
                  src={src}
                  alt={p.name || "Producto"}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 6,
                    display: "block",
                    background: "#111",
                  }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (img.dataset.fallbackApplied === "1") return; // evitar bucle
                    img.dataset.fallbackApplied = "1";
                    img.src = "/placeholder.jpg";
                  }}
                />
              </div>

              <div style={{ color: "inherit" }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                {typeof displayPrice === "number" ? (
                  <div style={{ opacity: 0.85 }}>
                    ${displayPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                ) : (
                  <div style={{ opacity: 0.6 }}>Sin precio</div>
                )}
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
