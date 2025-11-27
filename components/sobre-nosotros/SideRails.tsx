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

type SidebarOffer = {
  id: number;
  productId: number | null;
  product?: {
    id: number;
    name: string;
    slug: string;
  } | null;
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
 * Sidebar: Más vendidos
 * Sigue igual que antes, usando /api/public/catalogo
 */
export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      // Traemos catálogo “grande” y mostramos 6 primeros
      const data = await getJson<any>("/api/public/catalogo?perPage=48&sort=-id");
      const list: Prod[] =
        (data?.items as Prod[]) ??
        (data?.data as Prod[]) ??
        (data?.products as Prod[]) ??
        [];
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

/**
 * Sidebar: Ofertas
 * - Lee el catálogo completo (para tener precios, imágenes, etc.)
 * - Lee /api/public/sidebar-offers?take=6 para saber qué productos están en oferta
 * - Cruza por product.id y muestra solo esos productos
 */
export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      // 1) Catálogo “grande” (mismos datos que usa el resto del sitio)
      const catalogPromise = getJson<any>(
        "/api/public/catalogo?perPage=999&sort=-id"
      );

      // 2) Ofertas activas para el sidebar (IDs de productos en oferta)
      const offersPromise = getJson<{ ok?: boolean; items?: SidebarOffer[] }>(
        "/api/public/sidebar-offers?take=50"
      );

      const [catalogData, offersData] = await Promise.all([
        catalogPromise,
        offersPromise,
      ]);

      const catalogList: Prod[] =
        (catalogData?.items as Prod[]) ??
        (catalogData?.data as Prod[]) ??
        (catalogData?.products as Prod[]) ??
        [];

      // Si por algún motivo no vino nada de la API de ofertas, mostramos vacío
      if (!offersData || !Array.isArray(offersData.items)) {
        setItems([]);
        return;
      }

      // Conjunto de IDs de productos que están en oferta
      const offerIds = new Set<number>();
      for (const o of offersData.items) {
        const pid =
          typeof o.productId === "number"
            ? o.productId
            : typeof o.product?.id === "number"
            ? o.product.id
            : null;
        if (pid != null) {
          offerIds.add(pid);
        }
      }

      // Filtramos el catálogo por esos IDs
      const offersFromCatalog = catalogList.filter((p) => offerIds.has(p.id));

      // Nos quedamos con hasta 6
      setItems(offersFromCatalog.slice(0, 6));
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
