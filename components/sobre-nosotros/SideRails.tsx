// components/sobre-nosotros/SideRails.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";

type Prod = {
  id: number | string;
  // Puede venir de catálogo crudo o normalizado
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

  // Algunos endpoints pueden traer el producto anidado
  product?: any;

  // Permite campos extra sin romper TS
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
    // Limpiamos posibles símbolos de moneda
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
            // Algunos endpoints traen el producto anidado
            const base: any = raw;
            const p: any = base.product ?? base;

            // Título: name o title, del producto o del raw
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

            // Slug: preferimos el del producto
            const slug =
              (p.slug ??
                base.slug ??
                "") as string;

            // Precio actual: probamos varias combinaciones y parseamos string/number
            const price =
              toNumber(p.priceFinal ?? p.price) ??
              toNumber(base.priceFinal ?? base.price);

            // Precio original: igual que arriba
            const originalPrice =
              toNumber(
                p.priceOriginal ??
                  p.originalPrice ??
                  base.priceOriginal ??
                  base.originalPrice,
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
        "[SideOffers] fetch /api/public/sidebar-offers?take=6",
      );

      const data = await getJson<any>(
        "/api/public/sidebar-offers?take=6",
      );

      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (Array.isArray(data) ? (data as Prod[]) : []);

      console.log(
        "[SideOffers] ofertas recibidas:",
        list.length ?? 0,
      );

      setItems(list);
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
