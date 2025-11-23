// components/catalog/CatalogInfiniteGrid.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Item = any;

type CatalogInfiniteGridProps = {
  initialItems: Item[];
  initialPage: number;
  perPage: number;
  total: number;
  // query string sin el "page", por ej: "sort=-id&categoryId=3"
  baseQuery: string;
};

export default function CatalogInfiniteGrid({
  initialItems,
  initialPage,
  perPage,
  total,
  baseQuery,
}: CatalogInfiniteGridProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length < total);

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const qs = new URLSearchParams(baseQuery || "");
      const nextPage = page + 1;

      qs.set("page", String(nextPage));
      qs.set("perPage", String(perPage));
      if (!qs.has("status")) qs.set("status", "all");

      const res = await fetch(`/api/public/catalogo?${qs.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        setHasMore(false);
        return;
      }

      const json: any = await res.json().catch(() => ({}));
      const newItems: Item[] = Array.isArray(json?.items) ? json.items : [];

      if (!newItems.length) {
        setHasMore(false);
        return;
      }

      const responseTotal =
        typeof json?.filteredTotal === "number"
          ? json.filteredTotal
          : typeof json?.total === "number"
          ? json.total
          : total;

      setItems((prev) => {
        const merged = [...prev, ...newItems];
        if (merged.length >= responseTotal) {
          setHasMore(false);
        }
        return merged;
      });

      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, [baseQuery, hasMore, loading, page, perPage, total]);

  useEffect(() => {
    if (!hasMore) return;
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((raw: Item) => {
          const p = normalizeProduct(raw);
          return (
            <ProductCard
              key={p.id}
              slug={p.slug}
              title={p.title}
              image={p.image}
              price={p.price ?? undefined}
              originalPrice={p.originalPrice ?? undefined}
              outOfStock={p.outOfStock}
              brand={p.brand ?? undefined}
              subtitle={p.subtitle ?? undefined}
              variants={p.variants}
            />
          );
        })}
        {!items.length && !loading && (
          <p className="opacity-70 col-span-full">No hay resultados.</p>
        )}
      </div>

      {/* Sentinel para el IntersectionObserver */}
      <div ref={loaderRef} className="mt-4 h-8 flex items-center justify-center">
        {loading && (
          <span className="text-sm text-gray-500">Cargando más productos…</span>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <span className="text-xs text-gray-400">
            Mostrados todos los productos.
          </span>
        )}
      </div>
    </>
  );
}
