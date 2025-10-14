"use client";

import { useEffect, useRef } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

type Item = any;

export default function OffersCarousel({ items }: { items: Item[] }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (ents, obs) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("in");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (!items?.length) return null;
  const top = items.slice(0, 8).map(normalizeProduct);

  return (
    <section ref={ref} className="bg-white" aria-label="Ofertas destacadas">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold reveal in">Las Mejores Ofertas</h2>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {top.map((p, i) => (
            <div key={p.id} data-reveal style={{ "--i": i } as React.CSSProperties} className="reveal">
              <ProductCard
                slug={p.slug}
                title={p.title}
                image={p.image}
                price={p.price ?? undefined}
                originalPrice={p.originalPrice ?? undefined}
                outOfStock={p.outOfStock}
                brand={p.brand ?? undefined}
                subtitle={p.subtitle ?? undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
