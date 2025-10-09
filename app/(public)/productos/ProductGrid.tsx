// app/(public)/productos/ProductGrid.tsx
"use client";

import Link from "next/link";
import type { Product } from "./page";
import { toR2Url } from "@/lib/img";

type WithStatus = Product & {
  status?:
    | "ACTIVE"
    | "AGOTADO"
    | "INACTIVE"
    | "DRAFT"
    | "ARCHIVED"
    | string;
};

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
        const pp = p as WithStatus;
        const isAgotado = String(pp.status || "").toUpperCase() === "AGOTADO";

        const raw =
          (pp as any).cover ??
          (pp as any).coverUrl ??
          (pp as any).images?.[0] ??
          null;

        const src = toR2Url(raw);
        const displayPrice =
          typeof (pp as any).price === "number"
            ? (pp as any).price
            : typeof (pp as any).priceFinal === "number"
            ? (pp as any).priceFinal
            : typeof (pp as any).priceOriginal === "number"
            ? (pp as any).priceOriginal
            : null;

        return (
          <article
            key={(pp as any).id ?? pp.slug}
            style={{
              border: "1px solid #2b2b2b",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <Link
              href={`/productos/${pp.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  marginBottom: 8,
                  position: "relative",
                }}
              >
                {isAgotado && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      background: "#b91c1c",
                      color: "#fff",
                      zIndex: 2,
                    }}
                  >
                    AGOTADO
                  </div>
                )}

                {src ? (
                  <img
                    src={src}
                    alt={pp.name || "Producto"}
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
                      if (img.dataset.fallbackApplied === "1") return;
                      img.dataset.fallbackApplied = "1";
                      img.src = "/placeholder.jpg";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 6,
                      background: "#111",
                    }}
                  />
                )}
              </div>

              <div style={{ color: "inherit" }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{pp.name}</div>
                {typeof displayPrice === "number" ? (
                  <div style={{ opacity: isAgotado ? 0.65 : 0.85 }}>
                    $
                    {displayPrice.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
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
