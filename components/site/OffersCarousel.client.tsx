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

  const pageCount = Math.max(1, Math.ceil(totalItems / perView));
  const [page, setPage] = useState(0);

  const goTo = (idx: number) => {
    const c = ref.current;
    if (!c) return;
    const clamped = ((idx % pageCount) + pageCount) % pageCount;
    c.scrollTo({ left: clamped * c.clientWidth, behavior: "smooth" });
    setPage(clamped);
  };

  // Autoplay por "pantallas"
  useEffect(() => {
    if (!autoPlayMs) return;
    const id = window.setInterval(() => {
      if (!hover) goTo(page + 1);
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
      className="relative"
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Cada hijo ocupa un “slide” */}
        {React.Children.map(children, (child) => (
          <div className="snap-start">{child}</div>
        ))}
      </div>

      {/* Flechas */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => goTo(page - 1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => goTo(page + 1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
            }`}
          />
        ))}
      </div>
    </div>
  );
}
