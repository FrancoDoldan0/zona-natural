"use client";

import { useEffect, useRef } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { getClicksMap } from "@/lib/metrics";

type Product = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;
  images?: any[] | null;
  cover?: string | null;
  coverUrl?: string | null;
  image?: string | null;
  status?: string;
};

function chooseImage(p: Product): any {
  return (
    (p.images?.[0]?.url ? { url: p.images![0].url } : null) ??
    p.cover ??
    p.coverUrl ??
    p.image ??
    null
  );
}

function displayPrice(p: Product): number | undefined {
  if (typeof p.price === "number") return p.price;
  if (typeof p.priceFinal === "number") return p.priceFinal;
  if (typeof p.priceOriginal === "number") return p.priceOriginal;
  return undefined;
}

export default function BestSellersGrid({ items }: { items: Product[] }) {
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

  const clicks = getClicksMap();

  const picked =
    [...(items || [])]
      .map((p) => {
        const slug = String(p.slug || "");
        const clicksN = Number(clicks[slug] || 0);
        const hasDiscount =
          typeof p.priceFinal === "number" &&
          typeof p.priceOriginal === "number" &&
          p.priceFinal < p.priceOriginal;
        const score = clicksN * 5 + (hasDiscount ? 2 : 0) + Math.random() * 0.5;
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.p) || [];

  if (!picked.length) return null;

  return (
    <section ref={ref} className="bg-white" aria-label="Más vendidos">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl md:text-2xl font-semibold reveal in">Más vendidos</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {picked.map((p, i) => (
            <div key={p.id} data-reveal style={{ "--i": i } as React.CSSProperties} className="reveal">
              <ProductCard
                slug={`/producto/${p.slug}`}
                title={p.name}
                price={displayPrice(p)}
                originalPrice={
                  typeof p.priceOriginal === "number" ? p.priceOriginal : undefined
                }
                image={chooseImage(p)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
