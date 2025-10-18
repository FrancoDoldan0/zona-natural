// components/landing/HeroSlider.tsx
"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toR2Url } from "@/lib/img";
import Link from "next/link";

export type BannerItem = {
  id: number;
  title: string;
  image?:
    | { url?: string | null; r2Key?: string | null; key?: string | null }
    | string
    | null;
  linkUrl?: string | null;
};

const isInternal = (href?: string | null) =>
  !!href && !/^https?:\/\//i.test(href);

const ROTATE_MS = 5000; // cada 5s

export default function HeroSlider({ items }: { items: BannerItem[] }) {
  // normalizo y filtro por si algún banner no tiene imagen
  const slides = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list
      .map((b) => {
        // el API puede traer { url } en lugar de image/imageUrl
        const src = toR2Url((b as any).image ?? (b as any).url ?? "");
        return { ...b, _src: src };
      })
      .filter((b) => !!b._src);
  }, [items]);

  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(true);

  // observar visibilidad para pausar si no está en viewport
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // autoplay
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (!hover && inViewRef.current) {
        setI((x) => (x + 1) % slides.length);
      }
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [hover, slides.length]);

  const go = useCallback(
    (next: number) => setI((next + slides.length) % slides.length),
    [slides.length]
  );

  if (!slides.length) return null;

  return (
    <section aria-label="Promociones destacadas" className="bg-white">
      <div
        ref={rootRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative w-full overflow-hidden"
      >
        {/* Pista */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{
            transform: `translate3d(${-i * 100}%, 0, 0)`,
          }}
        >
          {slides.map((b) => {
            const href = b.linkUrl || "/catalogo";
            const internal = isInternal(href);
            const SlideContent = (
              <div className="relative w-full shrink-0">
                <div className="w-screen max-w-full aspect-[16/9] md:aspect-[16/6]">
                  <img
                    src={b._src as string}
                    alt={b.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex items-end md:items-center">
                    <div className="mx-auto max-w-7xl w-full px-4 py-6 md:py-12">
                      <h2 className="text-white text-2xl md:text-4xl font-bold drop-shadow">
                        {b.title}
                      </h2>
                      <div className="mt-3">
                        <span className="inline-block bg-emerald-700 text-white px-4 py-2 rounded-full text-sm md:text-base lift">
                          Comprar ahora
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );

            return internal ? (
              <Link key={b.id} href={href} className="w-full shrink-0">
                {SlideContent}
              </Link>
            ) : (
              <a key={b.id} href={href} className="w-full shrink-0">
                {SlideContent}
              </a>
            );
          })}
        </div>

        {/* Controles */}
        {slides.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={() => go(i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 text-white p-2 hover:bg-black/40"
            >
              ◀
            </button>
            <button
              aria-label="Siguiente"
              onClick={() => go(i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 text-white p-2 hover:bg-black/40"
            >
              ▶
            </button>

            {/* Dots */}
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Ir al banner ${idx + 1}`}
                  onClick={() => go(idx)}
                  className={`h-2 w-2 rounded-full transition ${
                    i === idx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
