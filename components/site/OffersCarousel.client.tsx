// components/site/OffersCarousel.client.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function OffersCarousel({
  children,
  autoPlayMs = 4000,
  ariaLabel = "Las mejores ofertas",
}: {
  children: React.ReactNode;
  autoPlayMs?: number;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [perView, setPerView] = useState(4);
  const totalItems = useMemo(() => React.Children.count(children), [children]);
  const reduceMotionRef = useRef(false);

  // Responsivo: 1 / 2 / 4 por vista
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 1024 ? 2 : 4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Respeta prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reduceMotionRef.current = e.matches;
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const pageCount = Math.max(1, Math.ceil(totalItems / perView));
  const [page, setPage] = useState(0);

  const goTo = (idx: number) => {
    const c = ref.current;
    if (!c) return;
    const clamped = ((idx % pageCount) + pageCount) % pageCount;
    c.scrollTo({
      left: clamped * c.clientWidth,
      behavior: reduceMotionRef.current ? "auto" : "smooth",
    });
    setPage(clamped);
  };

  // Autoplay por “pantallas”, se pausa en hover, en tab inactiva o con reduced motion
  useEffect(() => {
    if (!autoPlayMs) return;
    const id = window.setInterval(() => {
      if (
        !hover &&
        !reduceMotionRef.current &&
        document.visibilityState === "visible"
      ) {
        goTo(page + 1);
      }
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [page, autoPlayMs, hover, pageCount]);

  // Sincroniza el índice cuando se scrollea manualmente
  const onScroll = () => {
    const c = ref.current;
    if (!c) return;
    const p = Math.round(c.scrollLeft / c.clientWidth);
    setPage(Math.max(0, Math.min(pageCount - 1, p)));
  };

  return (
    <div
      className="relative overflow-hidden"
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ touchAction: "pan-y" }} // mejor gesto en mobile
    >
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 px-1 overscroll-x-contain"
        style={{ scrollbarWidth: "none" }}
      >
        {React.Children.map(children, (child) => (
          <div className="snap-start shrink-0">{child}</div>
        ))}
      </div>

      {/* Flechas (tap target >=44px en mobile) */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => goTo(page - 1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 md:p-2 shadow-md hover:bg-white
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => goTo(page + 1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 md:p-2 shadow-md hover:bg-white
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-2">
        {Array.from({ length: pageCount }).map((_, i) => (
          <button
            key={i}
            aria-label={`Ir a página ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 w-4 rounded-full transition-all ${
              i === page ? "bg-gray-900" : "bg-gray-300"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2`}
          />
        ))}
      </div>
    </div>
  );
}
