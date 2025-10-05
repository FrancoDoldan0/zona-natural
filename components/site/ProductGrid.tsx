// components/site/ProductGrid.tsx
export const runtime = "edge";

import ProductCard from "@/components/ui/ProductCard";
import { headers } from "next/headers";

/** Tipo laxo para lo que venga del API */
type Product = Record<string, any>;

/**
 * Construye una URL absoluta válida en Edge/Cloudflare.
 * - Si NEXT_PUBLIC_BASE_URL está definida, la usa.
 * - Si el path ya es absoluto (http/https), lo devuelve tal cual.
 * - Si no, arma proto://host usando x-forwarded-* (fallback a host).
 */
async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  const h = await headers(); // en CF puede ser Promise<ReadonlyHeaders>
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

async function fetchOffers(): Promise<Product[]> {
  try {
    const res = await fetch(await abs("/api/public/offers"), { cache: "no-store" });
    const payload: any = await res.json();

    let list: any =
      Array.isArray(payload)
        ? payload
        : payload?.products ?? payload?.items ?? payload?.data ?? [];

    // Fallback: si vino vacío, probamos el catálogo filtrado (si tu API lo soporta)
    if (!Array.isArray(list) || list.length === 0) {
      try {
        const res2 = await fetch(await abs("/api/public/catalogo?offers=active"), {
          cache: "no-store",
        });
        if (res2.ok) {
          const p2: any = await res2.json();
          list = Array.isArray(p2) ? p2 : p2?.items ?? p2?.data ?? [];
        }
      } catch {
        // ignore
      }
    }

    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Mapea un item del API a las props que espera <ProductCard /> */
function toCardProps(p: Product, idx: number) {
  const title: string =
    p.name ?? p.title ?? (p.product?.name ?? p.product?.title) ?? `Producto ${idx + 1}`;

  const slug: string | undefined =
    p.slug ?? p.product?.slug ?? (typeof p.id !== "undefined" ? String(p.id) : undefined);

  // Elige un precio razonable según lo que exponga el API
  const price: number | undefined =
    (typeof p.priceFinal === "number" ? p.priceFinal : undefined) ??
    (typeof p.price === "number" ? p.price : undefined) ??
    (typeof p.finalPrice === "number" ? p.finalPrice : undefined) ??
    (typeof p.priceOriginal === "number" ? p.priceOriginal : undefined);

  // Primer imagen disponible
  const imgFromArray =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images[0]?.url ?? p.images[0]?.src ?? p.images[0]
      : undefined;

  const image: string | undefined =
    p.image ?? p.cover ?? p.thumbnail ?? imgFromArray ?? p.product?.image ?? undefined;

  const outOfStock: boolean | undefined =
    typeof p.outOfStock === "boolean"
      ? p.outOfStock
      : typeof p.inStock === "boolean"
      ? !p.inStock
      : typeof p.stock === "number"
      ? p.stock <= 0
      : undefined;

  return { title, slug, price, image, outOfStock };
}

export default async function ProductGrid() {
  const items = await fetchOffers();

  if (!items.length) {
    return <p className="text-sm text-ink-500">No hay ofertas activas.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.slice(0, 8).map((p, idx) => {
        const props = toCardProps(p, idx);
        const key = (p.id ?? p.slug ?? idx).toString();
        return <ProductCard key={key} {...props} />;
      })}
    </div>
  );
}
