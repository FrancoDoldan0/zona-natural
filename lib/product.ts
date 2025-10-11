// lib/product.ts
import { toR2Url } from "@/lib/img";

export type NormalizedProduct = {
  id: number | string;
  slug: string;         // "tomate" (se resuelve a /producto/slug afuera si hace falta)
  title: string;
  image?: any;          // url | {url|key|r2Key}, lo resuelve ProductCard
  price?: number | null;
  originalPrice?: number | null;
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
};

export function normalizeProduct(raw: any): NormalizedProduct {
  // imagen candidata
  const img =
    raw?.cover ??
    raw?.coverUrl ??
    raw?.image ??
    raw?.imageUrl ??
    raw?.images?.[0] ??
    null;

  // precio visible
  const price =
    typeof raw?.price === "number"
      ? raw.price
      : typeof raw?.priceFinal === "number"
      ? raw.priceFinal
      : typeof raw?.priceOriginal === "number"
      ? raw.priceOriginal
      : null;

  return {
    id: String(raw?.id ?? ""),
    slug: String(raw?.slug ?? ""),
    title: String(raw?.name ?? raw?.title ?? ""),
    image: img,
    price,
    originalPrice:
      typeof raw?.priceOriginal === "number" ? raw.priceOriginal : null,
    outOfStock: String(raw?.status || "").toUpperCase() === "AGOTADO",
    brand: raw?.brand ?? raw?.marca ?? null,
    subtitle: raw?.shortDescription ?? raw?.subtitle ?? null,
  };
}
