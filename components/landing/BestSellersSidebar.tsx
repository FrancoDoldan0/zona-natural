// components/landing/BestSellersSidebar.tsx
"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Raw = Record<string, any>;

export default function BestSellersSidebar() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Traemos “los más vendidos”
        const res = await fetch("/api/public/catalogo?perPage=12&status=all&sort=-sold", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json = res.ok ? await res.json().catch(() => ({})) : {};
        const list: Raw[] =
          (json?.items as Raw[]) ??
          (json?.data as Raw[]) ??
          (Array.isArray(json) ? (json as Raw[]) : []) ??
          [];
        if (!alive) return;

        const norm = list.map(normalizeProduct);
        setItems(norm.slice(0, 8));
      } catch {
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <aside aria-label="Más vendidos" className="rounded-2xl border border-emerald-100 bg-white p-3">
      <h2 className="text-base font-semibold mb-2">Más vendidos</h2>

      {loading && (
        <div className="text-sm text-gray-500">Cargando…</div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500">Sin datos por ahora.</div>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            variant="row"
            slug={p.slug}
            title={p.title}
            image={p.image}
            price={typeof p.price === "number" ? p.price : undefined}
            originalPrice={typeof p.originalPrice === "number" ? p.originalPrice : undefined}
            outOfStock={p.outOfStock}
            brand={p.brand ?? undefined}
          />
        ))}
      </div>
    </aside>
  );
}
