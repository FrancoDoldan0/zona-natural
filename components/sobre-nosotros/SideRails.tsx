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
  title: string | null;
  discountType?: string | null;
  discountVal?: number | null;
  product?: {
    id: number;
    name: string;
    slug: string;
    price?: number | null;
    priceOriginal?: number | null;
    priceFinal?: number | null;
    imageUrl?: string | null;
    coverUrl?: string | null;
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

export function SideBestSellers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      // Traemos catálogo “grande” y mostramos 6
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

export function SideOffers() {
  const [items, setItems] = useState<Prod[] | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getJson<{ ok?: boolean; items?: SidebarOffer[] }>(
        "/api/public/sidebar-offers?take=6"
      );

      if (!data || !Array.isArray(data.items)) {
        setItems([]);
        return;
      }

      // Normalizamos la respuesta de sidebar-offers a Prod
      const normalized: Prod[] = data.items
        .map((o) => ({
          id: o.product?.id ?? o.id,
          name: o.product?.name ?? o.title ?? "Producto en oferta",
          slug: o.product?.slug ?? "",
          // Hoy la API de sidebar-offers no devuelve precios ni imágenes,
          // pero dejamos los campos preparados por si en el futuro se agregan.
          price: o.product?.price ?? o.product?.priceFinal ?? null,
          priceFinal: o.product?.priceFinal ?? o.product?.price ?? null,
          priceOriginal: o.product?.priceOriginal ?? null,
          imageUrl: o.product?.coverUrl ?? o.product?.imageUrl ?? null,
          coverUrl: o.product?.coverUrl ?? null,
          appliedOffer: {
            discountType: o.discountType,
            discountVal: o.discountVal,
            title: o.title,
          },
        }))
        // Evitamos productos sin slug, porque el link no se podría armar.
        .filter((p) => !!p.slug);

      setItems(normalized);
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
