// components/landing/OffersCarousel.tsx
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Item = any;

export default function OffersCarousel({ items }: { items: Item[] }) {
  if (!items?.length) return null;

  const top = items.slice(0, 8).map(normalizeProduct);

  return (
    <section className="bg-white" aria-label="Ofertas destacadas">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold">Las Mejores Ofertas</h2>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {top.map((p) => (
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
          ))}
        </div>
      </div>
    </section>
  );
}
