// components/landing/OffersCarousel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import ProductCard from "@/components/ui/ProductCard";
import Link from "next/link";

const DEFAULT_VISIBLE = 8;

type Item = {
  id: number | string;
  slug: string;

  name?: string;
  title?: string;

  image?: string | null;
  cover?: string | null;
  imageUrl?: string | null;
  images?: { url?: string | null }[];

  price?: number | null;
  originalPrice?: number | null;

  priceFinal?: number | null;
  priceOriginal?: number | null;
  discountPercent?: number | null;

  status?: string | null;
  outOfStock?: boolean;

  brand?: string | null;
  subtitle?: string | null;
  variants?: any;

  [key: string]: any;
};

function windowSlice<T>(arr: T[], start: number, count: number): T[] {
  if (arr.length <= count) return arr.slice(); // devuelve todo si entra en una “página”
  const end = start + count;
  if (end <= arr.length) return arr.slice(start, end);
  const head = arr.slice(start);
  const tail = arr.slice(0, end % arr.length);
  return head.concat(tail);
}

/**
 * Toma la mejor URL de imagen posible, sin lógica pesada.
 * Asume que la landing ya resolvió la portada en imageUrl / image / cover.
 */
function pickImageLight(raw: Item): string | null {
  const take = (v: any): string | null =>
    typeof v === "string" && v.trim().length ? v : null;

  const direct =
    take(raw.imageUrl) ??
    take(raw.image) ??
    take(raw.cover) ??
    (Array.isArray(raw.images) ? take(raw.images[0]?.url) : null);

  return direct;
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

  // Normalizamos lo mínimo necesario para ProductCard y orden por % descuento
  const all = useMemo(() => {
    if (!Array.isArray(items) || !items.length) return [];

    const normalized = items.map((raw) => {
      const image = pickImageLight(raw);

      const title =
        raw.title ??
        raw.name ??
        "";

      const slug = raw.slug ?? "";

      const priceFinal =
        typeof raw.priceFinal === "number"
          ? raw.priceFinal
          : typeof raw.price === "number"
          ? raw.price
          : null;

      const priceOriginal =
        typeof raw.priceOriginal === "number"
          ? raw.priceOriginal
          : typeof raw.originalPrice === "number"
          ? raw.originalPrice
          : null;

      const discountPercent =
        typeof raw.discountPercent === "number"
          ? raw.discountPercent
          : priceFinal != null &&
            priceOriginal != null &&
            priceOriginal > 0
          ? Math.round((1 - priceFinal / priceOriginal) * 100)
          : null;

      return {
        ...raw,
        slug,
        title,
        image,
        price: priceFinal,
        originalPrice: priceOriginal,
        priceFinal,
        priceOriginal,
        discountPercent,
      };
    });

    // Ordenamos por % de descuento (mayor primero)
    return normalized.sort((a, b) => {
      const da = typeof a.discountPercent === "number" ? a.discountPercent : 0;
      const db = typeof b.discountPercent === "number" ? b.discountPercent : 0;
      return db - da;
    });
  }, [items]);

  // Rotación
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(true);

  // hasEverBeenVisible: para iniciar lógica solo cuando entra en viewport
  const [isActive, setIsActive] = useState(false);
  // visibleInView: para pausar cuando se scrollea fuera
  const [visibleInView, setVisibleInView] = useState(false);

  // Detectar visibilidad del bloque raíz
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsActive(true); // se activa la lógica al entrar por primera vez
          setVisibleInView(true);
        } else {
          setVisibleInView(false);
        }
      },
      { threshold: 0.2 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reveal inicial de cards (solo cuando el carrusel está activo)
  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive]);

  const showCount = useMemo(() => {
    if (!all.length) return 0;
    return Math.max(1, Math.min(visible, all.length));
  }, [all.length, visible]);

  const step = useMemo(
    () => (all.length <= showCount ? 1 : showCount),
    [all.length, showCount]
  );

  // Auto-rotación: solo cuando:
  // - el carrusel ya se activó (entró en viewport al menos una vez)
  // - está visible actualmente
  // - está reproduciendo (no hover)
  useEffect(() => {
    if (!isActive || !visibleInView || !playing || all.length <= showCount) {
      return;
    }

    const id = setInterval(() => {
      setStart((s) => (s + step) % all.length);
    }, Math.max(2000, rotationMs));

    return () => clearInterval(id);
  }, [isActive, visibleInView, playing, all.length, showCount, step, rotationMs]);

  const current = useMemo(
    () => (showCount > 0 ? windowSlice(all, start, showCount) : []),
    [all, start, showCount]
  );

  // Cuando cambiamos de "ventana", marcamos los nuevos elementos como revelados
  useEffect(() => {
    if (!isActive) return;
    const root = ref.current;
    if (!root) return;
    const fresh = root.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)");
    fresh.forEach((el) => el.classList.add("in"));
  }, [isActive, start, showCount, all.length]);

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
            const image =
              p.image ??
              p.imageUrl ??
              p.cover ??
              (Array.isArray(p.images) ? p.images[0]?.url ?? null : null) ??
              undefined;

            const price = p.priceFinal ?? p.price ?? undefined;
            const originalPrice =
              p.priceOriginal ?? p.originalPrice ?? undefined;

            const outOfStock =
              typeof p.outOfStock === "boolean"
                ? p.outOfStock
                : (p.status ?? "").toUpperCase() === "AGOTADO";

            return (
              <div
                key={`${p.id}-${(start + i) % all.length}`}
                data-reveal
                style={{ "--i": i } as React.CSSProperties}
                className="reveal"
              >
                <ProductCard
                  slug={p.slug}
                  title={p.title ?? p.name ?? ""}
                  image={image}
                  price={price}
                  originalPrice={originalPrice}
                  outOfStock={outOfStock}
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
