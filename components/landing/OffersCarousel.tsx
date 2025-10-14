"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";
import Link from "next/link";

type Item = any;
const VISIBLE = 8;

function windowSlice<T>(arr: T[], start: number, count: number): T[] {
  if (arr.length <= count) return arr;
  const end = start + count;
  if (end <= arr.length) return arr.slice(start, end);
  const head = arr.slice(start);
  const tail = arr.slice(0, end % arr.length);
  return head.concat(tail);
}

export default function OffersCarousel({
  items,
  rotationMs = 6000,
}: {
  items: Item[];
  rotationMs?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  // Reveal: ya existente
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
    const list = Array.isArray(items) ? items.map(normalizeProduct) : [];
    // si querés, priorizamos descuentos fuertes primero
    return list.sort((a, b) => {
      const da = (a.originalPrice ?? 0) && (a.price ?? 0) ? (1 - (a.price! / a.originalPrice!)) : 0;
      const db = (b.originalPrice ?? 0) && (b.price ?? 0) ? (1 - (b.price! / b.originalPrice!)) : 0;
      return db - da;
    });
  }, [items]);

  // Rotación automática
  const [start, setStart] = useState(0);
  const [playing, setPlaying] = useState(true); // pausa cuando no está visible/hover
  const [visibleInView, setVisibleInView] = useState(false);

  // Detectar visibilidad de la sección para pausar rotación fuera de viewport
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

  useEffect(() => {
    if (!playing || !visibleInView || all.length <= VISIBLE) return;
    const id = setInterval(() => {
      setStart((s) => (s + VISIBLE) % all.length);
    }, Math.max(2000, rotationMs));
    return () => clearInterval(id);
  }, [playing, visibleInView, all.length, rotationMs]);

  const current = useMemo(() => windowSlice(all, start, VISIBLE), [all, start]);

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
          <h2 className="text-2xl md:text-3xl font-semibold reveal in">Las Mejores Ofertas</h2>
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
            <div key={`${p.id}-${i}`} data-reveal style={{ "--i": i } as React.CSSProperties} className="reveal">
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

        {/* Indicador mini (opcional): cuántas ofertas totales */}
        {all.length > VISIBLE && (
          <div className="mt-3 text-xs text-gray-500">
            Mostrando {VISIBLE} de {all.length} ofertas
          </div>
        )}
      </div>
    </section>
  );
}
