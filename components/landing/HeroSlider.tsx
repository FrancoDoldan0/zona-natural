"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toR2Url } from "@/lib/img";
import Link from "next/link";

export type BannerItem = {
  id: number;
  title: string;
  image?: { url?: string | null; r2Key?: string | null; key?: string | null } | string | null;
  linkUrl?: string | null;
};

const isInternal = (href?: string | null) => !!href && !/^https?:\/\//i.test(href);

export default function HeroSlider({ items }: { items: BannerItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  // Reveal al entrar en viewport
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && el.classList.add("in")),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Parallax sutil en el overlay (respeta reduced motion)
  const onMove = useCallback((e: React.MouseEvent) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget as HTMLDivElement;
    const r = el.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    // límites pequeños para no marear
    setParallax({ x: cx * 8, y: cy * 6 });
  }, []);

  const onLeave = useCallback(() => setParallax({ x: 0, y: 0 }), []);

  if (!items?.length) return null;

  return (
    <section aria-label="Promociones destacadas" className="bg-white">
      <div
        ref={rootRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative w-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex"
      >
        {items.map((b) => {
          const src = toR2Url(b.image ?? "");
          const href = b.linkUrl || "/catalogo";
          const internal = isInternal(href);

          const Content = (
            <div className="w-screen max-w-full aspect-[16/9] md:aspect-[16/6]">
              <img
                src={src}
                alt={b.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div
                className="absolute inset-0 flex items-end md:items-center"
                style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)` }}
              >
                <div className="mx-auto max-w-7xl w-full px-4 py-6 md:py-12">
                  <h2 className="text-white text-2xl md:text-4xl font-bold drop-shadow">{b.title}</h2>
                  <div className="mt-3">
                    <span className="inline-block bg-emerald-700 text-white px-4 py-2 rounded-full text-sm md:text-base lift">
                      Comprar ahora
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );

          return internal ? (
            <Link key={b.id} href={href} className="relative w-full shrink-0 snap-center md:snap-start">
              {Content}
            </Link>
          ) : (
            <a key={b.id} href={href} className="relative w-full shrink-0 snap-center md:snap-start">
              {Content}
            </a>
          );
        })}
      </div>
    </section>
  );
}
