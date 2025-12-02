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

/** Normalizamos lo mínimo necesario para ProductCard */
function normalizeOfferItem(raw: any) {
  if (!raw) return null;

  // A veces puede venir como { product: {...} }
  const p = raw.product ?? raw;

  const takeStr = (v: any): string | null =>
    typeof v === "string" && v.trim().length ? v : null;

  // Título
  const title =
    p.title ??
    p.name ??
    raw.title ??
    raw.name ??
    "";

  // Slug
  const slug =
    p.slug ??
    raw.slug ??
    p.productSlug ??
    "";

  // Imagen principal: probamos varias fuentes
  let image: string | null =
    takeStr(p.image) ||
    takeStr(p.cover) ||
    takeStr(p.imageUrl) ||
    takeStr(raw.image) ||
    takeStr(raw.cover) ||
    takeStr(raw.imageUrl) ||
    (Array.isArray(p.images) && takeStr(p.images[0]?.url)) ||
    (Array.isArray(raw.images) && takeStr(raw.images[0]?.url)) ||
    null;

  // Precios (ofertas landing suelen venir con price / originalPrice o priceFinal / priceOriginal)
  const price =
    typeof p.price === "number"
      ? p.price
      : typeof p.priceFinal === "number"
      ? p.priceFinal
      : typeof raw.price === "number"
      ? raw.price
      : typeof raw.priceFinal === "number"
      ? raw.priceFinal
      : null;

  const originalPrice =
    typeof p.originalPrice === "number"
      ? p.originalPrice
      : typeof p.priceOriginal === "number"
      ? p.priceOriginal
      : typeof raw.originalPrice === "number"
      ? raw.originalPrice
      : typeof raw.priceOriginal === "number"
      ? raw.priceOriginal
      : null;

  const outOfStock = p.outOfStock ?? raw.outOfStock ?? false;
  const brand = p.brand ?? raw.brand ?? undefined;
  const subtitle = p.subtitle ?? raw.subtitle ?? undefined;
  const variants = p.variants ?? raw.variants ?? undefined;

  return {
    id: p.id ?? raw.id,
    title,
    slug,
    image,
    price,
    originalPrice,
    outOfStock,
    brand,
    subtitle,
    variants,
  };
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

  // Reveal inicial (observa lo que está montado al principio)
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

  // Normalizar todas las ofertas que llegan
  const all = useMemo(() => {
    if (!Array.isArray(items) || !items.length) return [];

    const normalized = items
      .map((raw) => normalizeOfferItem(raw))
      .filter((x): x is NonNullable<typeof x> => !!x);

    // Ordenamos por % de descuento si tenemos ambos precios
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

  // Rotación
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(true);
  // Inicialmente visible para que empiece a rotar, luego el IO lo ajusta.
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
  // Paso adaptable: si hay pocas ofertas, avanzar de a 1; si hay muchas, por “página”
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

  // ✅ Cada vez que rota o cambia la ventana visible,
  // marcamos los nuevos nodos como visibles.
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
          {current.map((p, i) => (
            <div
              key={`${p.id}-${(start + i) % all.length}`}
              data-reveal
              style={{ "--i": i } as React.CSSProperties}
              className="reveal"
            >
              <ProductCard
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
            </div>
          ))}
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
