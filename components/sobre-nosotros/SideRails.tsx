// components/sobre-nosotros/SideRails.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Prod = {
  id: number | string;
  // Puede venir crudo, normalizado o anidado
  name?: string | null;
  title?: string | null;
  slug?: string | null;

  // Distintos campos posibles de precio
  price?: number | string | null;
  priceFinal?: number | string | null;
  priceOriginal?: number | string | null;
  originalPrice?: number | string | null;

  image?: any;
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: string | null;
  images?: { url: string; alt?: string | null }[];

  appliedOffer?: any | null;
  offer?: any | null;

  product?: any; // por si viene anidado

  [key: string]: any;
};

function firstImage(p: Prod) {
  // 1) Intentamos con el propio objeto
  const direct =
    p.cover ??
    p.coverUrl ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length
      ? p.images[0]
      : null);

  if (direct) return direct;

  // 2) Si viene anidado en product, probamos ahí
  const inner = p.product as any;
  if (!inner) return null;

  return (
    inner.cover ??
    inner.coverUrl ??
    inner.image ??
    inner.imageUrl ??
    (Array.isArray(inner.images) && inner.images.length
      ? inner.images[0]
      : null)
  );
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function SmallList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Prod[] | null;
}) {
  return (
    <div className="rounded-xl ring-1 ring-emerald-100 bg-white p-3">
      <div className="mb-2 font-semibold">{title}</div>

      {!items && (
        <div className="text-sm text-gray-500">Cargando…</div>
      )}

      {items && items.length === 0 && (
        <div className="text-sm text-emerald-700/80 bg-emerald-50/60 rounded-md px-2 py-1">
          {emptyText}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-2">
          {items.map((raw) => {
            const base: any = raw;
            const p: any = base.product ?? base;

            // Título
            const rawTitle =
              p.name ??
              p.title ??
              base.name ??
              base.title ??
              "-";
            const titleStr =
              typeof rawTitle === "string"
                ? rawTitle
                : String(rawTitle ?? "-");

            // Slug
            const slug =
              (p.slug ??
                base.slug ??
                "") as string;

            // Precio actual
            const price =
              toNumber(p.price ?? p.priceFinal) ??
              toNumber(base.price ?? base.priceFinal);

            // Precio original
            const originalPrice =
              toNumber(
                p.originalPrice ??
                  p.priceOriginal ??
                  base.originalPrice ??
                  base.priceOriginal,
              );

            return (
              <ProductCard
                key={String(raw.id)}
                variant="row"
                slug={slug}
                title={titleStr}
                image={firstImage(raw)}
                price={price}
                originalPrice={originalPrice}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(
        "[SideRails] fetch fallo",
        url,
        res.status,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[SideRails] error fetch", url, err);
    return null;
  }
}

export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      console.log(
        "[SideRails] fetch /api/public/catalogo?perPage=48&sort=-id",
      );
      const data = await getJson<any>(
        "/api/public/catalogo?perPage=48&sort=-id",
      );

      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (data?.products as Prod[]) ??
        [];

      console.log(
        "[SideBestSellers] productos en catálogo:",
        list.length ?? 0,
      );

      setItems(list.slice(0, 6));
    })();
  }, []);

  return (
    <SmallList
      title="Más vendidos"
      emptyText="No hay productos para mostrar."
      items={items}
    />
  );
}

export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      console.log(
        "[SideOffers] fetch /api/public/catalogo?perPage=120&status=all&onSale=1&sort=-id",
      );

      const data = await getJson<any>(
        "/api/public/catalogo?perPage=120&status=all&onSale=1&sort=-id",
      );

      const raw: any[] =
        (data?.items as any[]) ??
        (data?.data as any[]) ??
        (Array.isArray(data) ? (data as any[]) : []);

      console.log(
        "[SideOffers] raw ofertas desde catálogo:",
        raw.length ?? 0,
      );

      // Normalizamos igual que en /ofertas
      const normalized = raw.map((p) =>
        normalizeProduct(p),
      ) as any[];

      // Filtro de seguridad: solo donde price < originalPrice
      const offers = normalized.filter((p) => {
        const price = toNumber(p.price);
        const orig = toNumber(p.originalPrice);
        return price != null && orig != null && price < orig;
      });

      console.log(
        "[SideOffers] ofertas con descuento real:",
        offers.length ?? 0,
      );

      setItems(offers.slice(0, 6) as Prod[]);
    })();
  }, []);

  return (
    <SmallList
      title="Ofertas"
      emptyText="No hay productos para mostrar."
      items={items}
    />
  );
}
