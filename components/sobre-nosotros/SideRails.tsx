// components/sobre-nosotros/SideRails.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ui/ProductCard";

/* ---------- Tipos compartidos ---------- */

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
  title?: string | null;
  productId?: number | null;
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

/* ---------- UI genérica para listas de productos ---------- */

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

/* ---------- Helper genérico para fetch JSON ---------- */

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    console.log("[SideRails] fetch", url, res.status);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[SideRails] non-OK response", url, res.status, text);
      return null;
    }
    const json = (await res.json()) as T;
    console.log("[SideRails] json", url, json);
    return json;
  } catch (err) {
    console.error("[SideRails] error fetching", url, err);
    return null;
  }
}

/* =========================================================
 *  MÁS VENDIDOS – igual que antes
 * =======================================================*/

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
      console.log("[SideBestSellers] productos en catálogo:", list.length);
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

/* =========================================================
 *  OFERTAS – versión simple usando solo /api/public/sidebar-offers
 * =======================================================*/

export function SideOffers() {
  const [offers, setOffers] = useState<SidebarOffer[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log("[SideOffers] fetching sidebar offers…");
        const res = await fetch("/api/public/sidebar-offers?take=6", {
          cache: "no-store",
        });
        console.log("[SideOffers] status", res.status);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.warn("[SideOffers] non-OK response body:", txt);
          setOffers([]);
          return;
        }
        const json: any = await res.json();
        console.log("[SideOffers] json", json);

        const arr: SidebarOffer[] = Array.isArray(json?.items)
          ? (json.items as SidebarOffer[])
          : [];

        setOffers(arr);
      } catch (err) {
        console.error("[SideOffers] error general", err);
        setOffers([]);
      }
    })();
  }, []);

  return (
    <div className="rounded-xl ring-1 ring-emerald-100 bg-white p-3">
      <div className="mb-2 font-semibold">Ofertas</div>

      {/* Cargando */}
      {offers === null && (
        <div className="text-sm text-gray-500">Cargando…</div>
      )}

      {/* Sin ofertas */}
      {offers !== null && offers.length === 0 && (
        <div className="text-sm text-emerald-700/80 bg-emerald-50/60 rounded-md px-2 py-1">
          No hay productos para mostrar.
        </div>
      )}

      {/* Lista de ofertas */}
      {offers !== null && offers.length > 0 && (
        <ul className="space-y-2">
          {offers.map((o) => {
            const name =
              o.product?.name ?? o.title ?? "Producto en oferta";
            const slug = o.product?.slug ?? "";
            const href = slug ? `/producto/${slug}` : undefined;

            return (
              <li
                key={o.id}
                className="text-sm flex items-start gap-2 border-b border-emerald-50 last:border-none pb-1"
              >
                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {href ? (
                  <Link
                    href={href}
                    className="hover:underline text-emerald-800"
                  >
                    {name}
                  </Link>
                ) : (
                  <span className="text-emerald-800">{name}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
