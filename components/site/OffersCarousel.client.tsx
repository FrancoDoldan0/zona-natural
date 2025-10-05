// components/site/OffersCarousel.client.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

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

  // Autoplay que avanza una “pantalla” a la vez
  useEffect(() => {
    if (!autoPlayMs) return;
    const id = window.setInterval(() => {
      if (hover) return;
      const c = ref.current;
      if (!c) return;
      const atEnd = Math.ceil(c.scrollLeft + c.clientWidth) >= c.scrollWidth - 2;
      c.scrollTo({
        left: atEnd ? 0 : c.scrollLeft + c.clientWidth,
        behavior: "smooth",
      });
    }, autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, hover]);

  const scrollBy = (dir: -1 | 1) => {
    const c = ref.current;
    if (!c) return;
    c.scrollBy({ left: dir * c.clientWidth, behavior: "smooth" });
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
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4"
      >
        {/* Cada hijo debe ocuparse de setear su ancho mínimo */}
        {React.Children.map(children, (child, i) => (
          <div className="snap-start">{child}</div>
        ))}
      </div>

      {/* Flechas */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scrollBy(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => scrollBy(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
