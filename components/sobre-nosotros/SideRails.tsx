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
  price?: number | null;
  priceFinal?: number | null;
  priceOriginal?: number | null;
  originalPrice?: number | null;

  image?: any;
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  appliedOffer?: any | null;
  offer?: any | null;
};

function firstImage(p: Prod) {
  return (
    p.cover ??
    p.coverUrl ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length
      ? p.images[0]
      : null)
  );
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
          {items.map((p) => {
            // Título: aceptamos name o title
            const title =
              p.name?.toString() ??
              p.title?.toString() ??
              "-";

            // Precio actual: puede venir en varios campos
            const price =
              typeof p.priceFinal === "number"
                ? p.priceFinal
                : typeof p.price === "number"
                ? p.price
                : null;

            // Precio original (para tachado / descuento)
            const originalPrice =
              typeof p.priceOriginal === "number"
                ? p.priceOriginal
                : typeof p.originalPrice === "number"
                ? p.originalPrice
                : null;

            const slug = p.slug ?? "";

            return (
              <ProductCard
                key={p.id}
                variant="row"
                slug={slug}
                title={title}
                image={firstImage(p)}
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
        "[SideOffers] fetch /api/public/catalogo?perPage=48&status=all&onSale=1&sort=-id",
      );

      const data = await getJson<any>(
        "/api/public/catalogo?perPage=48&status=all&onSale=1&sort=-id",
      );

      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (Array.isArray(data) ? (data as Prod[]) : []);

      console.log(
        "[SideOffers] ofertas encontradas en catálogo:",
        list.length ?? 0,
      );

      // Nos quedamos con las primeras 6 ofertas
      setItems(list.slice(0, 6));
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
