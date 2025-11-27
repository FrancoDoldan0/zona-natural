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
  items: Prod | Prod[] | null;
}) {
  const list = Array.isArray(items) ? items : items ? [items] : null;

  return (
    <div className="rounded-xl ring-1 ring-emerald-100 bg-white p-3">
      <div className="mb-2 font-semibold">{title}</div>

      {!list && <div className="text-sm text-gray-500">Cargando…</div>}

      {list && list.length === 0 && (
        <div className="text-sm text-emerald-700/80 bg-emerald-50/60 rounded-md px-2 py-1">
          {emptyText}
        </div>
      )}

      {list && list.length > 0 && (
        <div className="grid gap-2">
          {list.map((p) => (
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
 * Igual que antes, usando /api/public/catalogo
 */
export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
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
 * - Usa /api/public/sidebar-offers?take=50 para obtener los IDs de productos en oferta
 * - Cruza esos IDs con el catálogo público (/api/public/catalogo)
 * - Si no encuentra nada, hace fallback y muestra igual los productos de sidebar-offers
 */
export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Catálogo completo (para tener precios, imágenes, etc.)
        const catalogPromise = getJson<any>(
          "/api/public/catalogo?perPage=999&sort=-id"
        );

        // 2) Ofertas activas para el sidebar (IDs de productos)
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

        const offers: SidebarOffer[] = Array.isArray(offersData?.items)
          ? offersData!.items!
          : [];

        if (!offers.length) {
          // No hay ofertas activas
          setItems([]);
          return;
        }

        // Set de IDs de productos en oferta (normalizados con Number)
        const offerIds = new Set<number>();
        for (const o of offers) {
          const rawId: any =
            (o as any).productId ?? (o as any).product?.id ?? (o as any).id;
          const pid = Number(rawId);
          if (!Number.isNaN(pid)) {
            offerIds.add(pid);
          }
        }

        // Intentamos matchear contra el catálogo público
        let offersFromCatalog: Prod[] = [];
        if (catalogList.length) {
          offersFromCatalog = catalogList.filter((p) => {
            const pid = Number((p as any).id);
            return !Number.isNaN(pid) && offerIds.has(pid);
          });
        }

        if (offersFromCatalog.length > 0) {
          // Éxito: tenemos productos completos (con precios e imágenes)
          setItems(offersFromCatalog.slice(0, 6));
          return;
        }

        // Fallback: construimos productos mínimos solo con lo que viene de sidebar-offers
        const fallback: Prod[] = offers.map((o) => {
          const rawId: any =
            (o as any).productId ?? (o as any).product?.id ?? (o as any).id;
          const pid = Number(rawId);
          const baseId = Number.isNaN(pid) ? Math.random() : pid;

          const name =
            (o as any).product?.name ??
            (o as any).title ??
            "Producto en oferta";
          const slug =
            (o as any).product?.slug ??
            (typeof (o as any).productId === "number"
              ? String((o as any).productId)
              : "");

          return {
            id: baseId,
            name,
            slug,
            price: null,
            priceOriginal: null,
          };
        });

        setItems(fallback.slice(0, 6));
      } catch {
        setItems([]);
      }
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
