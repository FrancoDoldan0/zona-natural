// app/(public)/productos/ProductGrid.tsx
"use client";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";
import type { Product } from "./page";

export default function ProductGrid({ items }: { items: Product[] }) {
  if (!items?.length) return <p style={{ opacity: 0.7 }}>No hay productos para mostrar.</p>;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((raw) => {
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
          />
        );
      })}
    </div>
  );
}
