// components/site/ProductGrid.tsx
export const runtime = "edge";

import ProductCard from "@/components/ui/ProductCard";
import { headers } from "next/headers";
import OffersCarousel from "@/components/site/OffersCarousel.client";

/** Tipos lazos según tus APIs públicas */
type OfferItem = {
  id: number;
  title: string | null;
  description: string | null;
  discountType: "PERCENT" | "AMOUNT";
  discountVal: number;
  startAt: string | null;
  endAt: string | null;
  productId: number | null;
  categoryId: number | null;
  tagId: number | null;
  product?: { id: number; name: string; slug: string } | null;
};

type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  cover?: string;
  image?: string;
  images?: Array<{ url?: string; src?: string } | string> | null;
  status?: "ACTIVE" | "AGOTADO" | string;
  priceOriginal?: number | null;
  priceFinal?: number | null;
};

type CardProps = {
  title: string;
  slug?: string;
  image?: string;
  price?: number;
  originalPrice?: number;
  outOfStock?: boolean;
};

/** URL absoluto en Edge/Cloudflare */
async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

/** Ofertas activas */
async function fetchOffers(): Promise<OfferItem[]> {
  try {
    const res = await fetch(await abs("/api/public/offers"), { cache: "no-store" });
    if (!res.ok) return [];
    const data: any = await res.json();
    const list: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    return list as OfferItem[];
  } catch {
    return [];
  }
}

/** Catálogo indexado */
async function fetchCatalogMap(): Promise<{
  byId: Map<number, CatalogProduct>;
  bySlug: Map<string, CatalogProduct>;
}> {
  const byId = new Map<number, CatalogProduct>();
  const bySlug = new Map<string, CatalogProduct>();

  try {
    const res = await fetch(await abs("/api/public/catalogo?page=1&perPage=200&sort=-id"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { byId, bySlug };
    const data: any = await res.json();
    const items: any[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    for (const it of items) {
      const p: CatalogProduct = it as CatalogProduct;
      byId.set(p.id, p);
      if (p.slug) bySlug.set(p.slug, p);
    }
  } catch {
    // ignore
  }
  return { byId, bySlug };
}

/** Aplica descuento */
function applyOfferPrice(base: number | null | undefined, off?: OfferItem): number | undefined {
  if (typeof base !== "number" || !off) return base ?? undefined;
  if (off.discountType === "AMOUNT") return Math.max(0, base - off.discountVal);
  if (off.discountType === "PERCENT") return Math.max(0, Math.round((base * (100 - off.discountVal)) / 100));
  return base;
}

/** URL de imagen del producto */
function resolveProductImage(p: CatalogProduct): string | undefined {
  const imgFromArray =
    Array.isArray(p.images) && p.images.length > 0
      ? (typeof p.images[0] === "string"
          ? (p.images[0] as string)
          : (p.images[0] as any)?.url ?? (p.images[0] as any)?.src)
      : undefined;

  return p.cover || p.image || imgFromArray || undefined;
}

/** Oferta + producto → props de Card */
function toCardProps(off: OfferItem, prod: CatalogProduct): CardProps {
  const title = prod.name || off.title || "Producto en oferta";
  const slug = prod.slug || off.product?.slug;
  const image = resolveProductImage(prod);
  const baseOriginal =
    typeof prod.priceOriginal === "number" ? prod.priceOriginal : prod.priceFinal ?? undefined;
  const finalPrice = applyOfferPrice(baseOriginal, off);
  const outOfStock =
    typeof prod.status === "string" ? prod.status.toUpperCase() === "AGOTADO" : undefined;

  return {
    title,
    slug,
    image,
    price: finalPrice,
    originalPrice: baseOriginal,
    outOfStock,
  };
}

export default async function ProductGrid() {
  const offers = await fetchOffers();
  if (!offers.length) {
    return <p className="text-sm text-ink-500">No hay ofertas activas.</p>;
  }

  const { byId, bySlug } = await fetchCatalogMap();

  const cards: CardProps[] = [];
  for (const off of offers) {
    const pid = off.productId ?? off.product?.id ?? null;
    const pslug = off.product?.slug ?? null;
    const prod =
      (pid != null ? byId.get(pid) : undefined) || (pslug ? bySlug.get(pslug) : undefined);
    if (!prod) continue;
    cards.push(toCardProps(off, prod));
  }

  if (!cards.length) {
    return <p className="text-sm text-ink-500">No hay ofertas activas.</p>;
  }

  // Slides anchos (estilo 300–320px), con “peek” en desktop
  return (
    <OffersCarousel autoPlayMs={4000} ariaLabel="Las mejores ofertas">
      {cards.map((props, i) => {
        const key = props.slug ?? String(i);
        return (
          <div
            key={key}
            className="min-w-[260px] sm:min-w-[300px] lg:min-w-[320px] pr-6"
          >
            <ProductCard {...props} />
          </div>
        );
      })}
    </OffersCarousel>
  );
}
