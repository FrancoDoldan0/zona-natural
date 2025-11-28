// components/sobre-nosotros/SideRails.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";

type Prod = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;
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
    (Array.isArray(p.images) && p.images.length ? p.images[0] : null)
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
      {!items && <div className="text-sm text-gray-500">Cargando…</div>}
      {items && items.length === 0 && (
        <div className="text-sm text-emerald-700/80 bg-emerald-50/60 rounded-md px-2 py-1">
          {emptyText}
        </div>
      )}
      {items && items.length > 0 && (
        <div className="grid gap-2">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              variant="row"
              slug={p.slug}
              title={p.name}
              image={firstImage(p)}
              price={
                typeof p.priceFinal === "number" ? p.priceFinal : p.price ?? null
              }
              originalPrice={
                typeof p.priceOriginal === "number" ? p.priceOriginal : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Cache de catálogo en memoria para no pegarle dos veces
 * a /api/public/catalogo desde Más vendidos y Ofertas.
 */
let catalogCache: Prod[] | null = null;
let catalogPromise: Promise<Prod[] | null> | null = null;

async function loadCatalogOnce(): Promise<Prod[] | null> {
  if (catalogCache) return catalogCache;

  if (!catalogPromise) {
    catalogPromise = (async () => {
      const data = await getJson<any>(
        "/api/public/catalogo?perPage=48&sort=-id"
      );
      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (data?.products as Prod[]) ??
        [];
      catalogCache = list;
      return list;
    })();
  }

  return catalogPromise;
}

export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      const list = (await loadCatalogOnce()) ?? [];
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
      const cat = (await loadCatalogOnce()) ?? [];

      // Misma lógica que te funcionaba antes, pero usando el catálogo compartido
      const offers = cat.filter((p) => {
        const fin = Number(p.priceFinal ?? p.price ?? NaN);
        const orig = Number(p.priceOriginal ?? NaN);
        const hasNumeric =
          !Number.isNaN(fin) && !Number.isNaN(orig) && fin < orig;
        const hasFlag = !!(p.appliedOffer || p.offer);
        return hasNumeric || hasFlag;
      });

      setItems(offers.slice(0, 6));
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
