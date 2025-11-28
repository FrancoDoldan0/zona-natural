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
    console.log("[SideRails] fetch", url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn("[SideRails] respuesta no OK para", url, res.status);
      return null;
    }
    const json = (await res.json()) as T;
    console.log("[SideRails] json", url, json);
    return json;
  } catch (err) {
    console.error("[SideRails] error fetcheando", url, err);
    return null;
  }
}

// ----------------------
// Más vendidos
// ----------------------
export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const data = await getJson<any>(
        "/api/public/catalogo?perPage=48&sort=-id"
      );
      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (data?.products as Prod[]) ??
        [];

      console.log("[SideBestSellers] productos en catálogo:", list.length);

      if (!alive) return;
      setItems(list.slice(0, 6));
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <SmallList
      title="Más vendidos"
      emptyText="No hay productos para mostrar."
      items={items}
    />
  );
}

// ----------------------
// Ofertas (con fotos)
// ----------------------
export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) Traemos las ofertas (ids de producto)
        const offersData = await getJson<any>(
          "/api/public/sidebar-offers?take=6"
        );
        const rawOffers: any[] = Array.isArray(offersData?.items)
          ? offersData.items
          : [];

        // 2) Traemos un bloque del catálogo con datos completos de productos
        const catalogData = await getJson<any>(
          "/api/public/catalogo?perPage=96&sort=-id"
        );
        const catalog: Prod[] =
          (catalogData?.items as Prod[]) ??
          (catalogData?.data as Prod[]) ??
          (catalogData?.products as Prod[]) ??
          [];

        console.log(
          "[SideOffers] ofertas:",
          rawOffers.length,
          "productos catálogo:",
          catalog.length
        );

        if (!alive) return;

        if (!rawOffers.length || !catalog.length) {
          setItems([]);
          return;
        }

        // 3) Mapa id -> producto para buscar rápido
        const byId = new Map<number, Prod>();
        for (const p of catalog) {
          if (typeof p.id === "number" && !byId.has(p.id)) {
            byId.set(p.id, p);
          }
        }

        // 4) Para cada oferta, buscamos el producto completo
        const matched: Prod[] = [];
        for (const offer of rawOffers) {
          const pid =
            typeof offer.productId === "number"
              ? offer.productId
              : typeof offer.product?.id === "number"
              ? offer.product.id
              : null;

          if (!pid) continue;
          const prod = byId.get(pid);
          if (prod) matched.push(prod);
        }

        setItems(matched);
      } catch (err) {
        console.error("[SideOffers] error obteniendo ofertas", err);
        if (!alive) return;
        setItems([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <SmallList
      title="Ofertas"
      emptyText="No hay productos para mostrar."
      items={items}
    />
  );
}
