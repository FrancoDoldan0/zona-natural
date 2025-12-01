// components/sobre-nosotros/SideRails.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Prod = {
  id: number | string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;

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

  product?: any;

  [key: string]: any;
};

function firstImage(p: Prod) {
  const direct =
    p.cover ??
    p.coverUrl ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length
      ? p.images[0]
      : null);

  if (direct) return direct;

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
            const p: any = raw;

            const rawTitle =
              p.name ??
              p.title ??
              raw.name ??
              raw.title ??
              "-";
            const titleStr =
              typeof rawTitle === "string"
                ? rawTitle
                : String(rawTitle ?? "-");

            const slug =
              (p.slug ??
                raw.slug ??
                "") as string;

            const price =
              toNumber(p.price ?? p.priceFinal) ??
              toNumber(raw.price ?? raw.priceFinal);

            const originalPrice =
              toNumber(
                p.originalPrice ??
                  p.priceOriginal ??
                  raw.originalPrice ??
                  raw.priceOriginal,
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

function getOfferProductId(offer: any): number | null {
  const candidates = [
    offer.productId,
    offer.product?.id,
  ];

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) {
      return c;
    }
    if (typeof c === "string") {
      const n = Number.parseInt(c, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function getOfferSlug(offer: any): string | null {
  const slug =
    offer.product?.slug ??
    offer.slug ??
    null;
  return typeof slug === "string" && slug.length > 0
    ? slug
    : null;
}

export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      // 1) Preguntamos al endpoint unificado cuáles ofertas mostrar
      console.log(
        "[SideOffers] fetch /api/public/sidebar-offers?take=6",
      );
      const dataOffers = await getJson<any>(
        "/api/public/sidebar-offers?take=6",
      );

      const offersRaw: any[] =
        (dataOffers?.items as any[]) ??
        (dataOffers?.data as any[]) ??
        (Array.isArray(dataOffers)
          ? (dataOffers as any[])
          : []);

      console.log(
        "[SideOffers] ofertas del endpoint:",
        offersRaw.length ?? 0,
      );

      if (!offersRaw.length) {
        setItems([]);
        return;
      }

      // 2) Armamos sets de IDs y slugs de los productos
      const offerInfos = offersRaw.map((o) => ({
        raw: o,
        productId: getOfferProductId(o),
        slug: getOfferSlug(o),
      }));

      const idSet = new Set<number>();
      const slugSet = new Set<string>();

      for (const info of offerInfos) {
        if (
          typeof info.productId === "number" &&
          Number.isFinite(info.productId)
        ) {
          idSet.add(info.productId);
        }
        if (info.slug) slugSet.add(info.slug);
      }

      // 3) Traemos catálogo completo (sin filtro de onSale)
      console.log(
        "[SideOffers] fetch catálogo para resolver productos",
      );
      const dataCatalog = await getJson<any>(
        "/api/public/catalogo?perPage=500&status=all&sort=-id",
      );

      const rawCatalog: any[] =
        (dataCatalog?.items as any[]) ??
        (dataCatalog?.data as any[]) ??
        (Array.isArray(dataCatalog)
          ? (dataCatalog as any[])
          : []);

      console.log(
        "[SideOffers] productos en catálogo:",
        rawCatalog.length ?? 0,
      );

      if (!rawCatalog.length) {
        setItems([]);
        return;
      }

      // 4) Normalizamos catálogo (igual que /ofertas)
      const normalizedCatalog = rawCatalog.map((p: any) =>
        normalizeProduct(p),
      ) as any[];

      const byId = new Map<number, any>();
      const bySlug = new Map<string, any>();

      for (const p of normalizedCatalog) {
        const id =
          typeof p.id === "number"
            ? p.id
            : Number.parseInt(String(p.id ?? ""), 10);
        if (Number.isFinite(id)) byId.set(id, p);

        if (
          typeof p.slug === "string" &&
          p.slug.length > 0
        ) {
          bySlug.set(p.slug, p);
        }
      }

      // 5) Para cada oferta del endpoint, buscamos su producto en el catálogo
      const resolved: Prod[] = [];

      for (const info of offerInfos) {
        let prod: any = null;

        if (
          typeof info.productId === "number" &&
          Number.isFinite(info.productId)
        ) {
          prod = byId.get(info.productId);
        }

        if (!prod && info.slug) {
          prod = bySlug.get(info.slug);
        }

        // Fallback: si igual no lo encontramos, intentamos normalizar el propio objeto
        if (!prod) {
          prod = normalizeProduct(info.raw.product ?? info.raw);
        }

        if (prod) {
          resolved.push(prod as Prod);
        }
      }

      console.log(
        "[SideOffers] ofertas resueltas para sidebar:",
        resolved.length ?? 0,
      );

      setItems(resolved.slice(0, 6));
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
