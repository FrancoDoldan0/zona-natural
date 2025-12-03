// components/landing/OffersCarousel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import ProductCard from "@/components/ui/ProductCard";
import Link from "next/link";

type Item = any;
const DEFAULT_VISIBLE = 8;

function windowSlice<T>(arr: T[], start: number, count: number): T[] {
  if (arr.length <= count) return arr.slice(); // devuelve todo si entra en una “página”
  const end = start + count;
  if (end <= arr.length) return arr.slice(start, end);
  const head = arr.slice(start);
  const tail = arr.slice(0, end % arr.length);
  return head.concat(tail);
}

// helper simple para quedarnos con una URL de imagen
function pickImage(raw: any): string | null {
  const take = (v: any): string | null =>
    typeof v === "string" && v.trim().length ? v : null;

  if (!raw) return null;

  // intentamos en este orden
  const candidates: any[] = [
    raw.image,
    raw.cover,
    raw.imageUrl,
    raw.product?.image,
    raw.product?.cover,
    raw.product?.imageUrl,
  ];

  for (const c of candidates) {
    const v = take(c);
    if (v) return v;
  }

  // arrays de imágenes
  if (Array.isArray(raw.images) && raw.images[0]?.url) {
    const v = take(raw.images[0].url);
    if (v) return v;
  }
  if (Array.isArray(raw.product?.images) && raw.product.images[0]?.url) {
    const v = take(raw.product.images[0].url);
    if (v) return v;
  }

  return null;
}

export default function OffersCarousel({
  items,
  rotationMs = 6000,
  visible = DEFAULT_VISIBLE,
}: {
  items: Item[];
  rotationMs?: number;
  /** cuántas cards mostrar a la vez */
  visible?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  // Reveal inicial
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

  // Normalizamos lo mínimo necesario para ProductCard
  const all = useMemo(() => {
    if (!Array.isArray(items) || !items.length) return [];

    const normalized = items.map((raw: any) => {
      const img = pickImage(raw);
      const title =
        raw.title ??
        raw.name ??
        raw.product?.title ??
        raw.product?.name ??
        "";

      const slug =
        raw.slug ??
        raw.product?.slug ??
        "";

      const price =
        typeof raw.price === "number"
          ? raw.price
          : typeof raw.priceFinal === "number"
          ? raw.priceFinal
          : null;

      const originalPrice =
        typeof raw.originalPrice === "number"
          ? raw.originalPrice
          : typeof raw.priceOriginal === "number"
          ? raw.priceOriginal
          : null;

      return {
        ...raw,
        title,
        slug,
        image: img,
        price,
        originalPrice,
      };
    });

    // Ordenamos por % de descuento
    return normalized.sort((a, b) => {
      const da =
        (a.originalPrice ?? 0) && (a.price ?? 0)
          ? 1 - (a.price as number) / (a.originalPrice as number)
          : 0;
      const db =
        (b.originalPrice ?? 0) && (b.price ?? 0)
          ? 1 - (b.price as number) / (b.originalPrice as number)
          : 0;
      return db - da;
    });
  }, [items]);

  // Logueamos las primeras ofertas para ver qué imagen llega
  useEffect(() => {
    if (!all.length) return;
    console.log(
      "[OffersCarousel] primeros items normalizados:",
      all.slice(0, 3).map((p) => ({
        id: p.id,
        title: p.title,
        image: p.image,
        cover: p.cover,
        imageUrl: p.imageUrl,
      }))
    );
  }, [all]);

  // Rotación
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visibleInView, setVisibleInView] = useState(true);

  // Detectar visibilidad para pausar fuera de viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisibleInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showCount = Math.max(1, Math.min(visible, all.length || visible));
  const step = all.length <= showCount ? 1 : showCount;

  useEffect(() => {
    if (!playing || !visibleInView || all.length <= 1) return;
    const id = setInterval(() => {
      setStart((s) => (s + step) % all.length);
    }, Math.max(2000, rotationMs));
    return () => clearInterval(id);
  }, [playing, visibleInView, all.length, rotationMs, step]);

  const current = useMemo(
    () => windowSlice(all, start, showCount),
    [all, start, showCount]
  );

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const fresh = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)");
    fresh.forEach((el) => el.classList.add("in"));
  }, [start, showCount, all.length]);

  if (!all.length) return null;

  return (
    <section
      ref={ref}
      className="bg-white"
      aria-label="Ofertas destacadas"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
    >
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-semibold reveal in">
            Las Mejores Ofertas
          </h2>
          <Link
            href="/ofertas"
            className="rounded-full px-3 py-1.5 text-sm ring-1 ring-emerald-200 text-emerald-700 hover:bg-emerald-50 lift"
            prefetch
          >
            Ver todas
          </Link>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {current.map((p, i) => {
            // Para asegurarnos, volvemos a calcular una imagen “plana” aquí
            const img =
              p.image ??
              p.cover ??
              p.imageUrl ??
              (Array.isArray(p.images) ? p.images[0]?.url : undefined) ??
              null;

            console.log("[OffersCarousel] card", {
              id: p.id,
              title: p.title,
              img,
            });

            return (
              <div
                key={`${p.id}-${(start + i) % all.length}`}
                data-reveal
                style={{ "--i": i } as React.CSSProperties}
                className="reveal"
              >
                <ProductCard
                  slug={p.slug}
                  title={p.title}
                  image={img}
                  price={p.price ?? undefined}
                  originalPrice={p.originalPrice ?? undefined}
                  outOfStock={p.outOfStock}
                  brand={p.brand ?? undefined}
                  subtitle={p.subtitle ?? undefined}
                  variants={p.variants}
                />
              </div>
            );
          })}
        </div>

        {all.length > showCount && (
          <div className="mt-3 text-xs text-gray-500">
            Mostrando {showCount} de {all.length} ofertas
          </div>
        )}
      </div>
    </section>
  );
}
