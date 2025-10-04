// components/site/Hero.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type Slide = {
  id?: string | number;
  image: string;
  href?: string;
  title?: string;
};

type Props = {
  slides: Slide[];
  intervalMs?: number;
  aspect?: "banner" | "square";
};

export default function Hero({ slides, intervalMs = 4500, aspect = "banner" }: Props) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeSlides = useMemo(
    () => slides.filter((s) => !!s?.image),
    [slides]
  );

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % safeSlides.length);
    }, intervalMs);
    return () => {
      timer.current && clearInterval(timer.current);
    };
  }, [safeSlides.length, intervalMs]);

  if (!safeSlides.length) return null;

  const go = (next: number) => {
    setIdx((next + safeSlides.length) % safeSlides.length);
  };

  const Wrapper = ({ href, children }: { href?: string; children: React.ReactNode }) => {
    if (href && href.startsWith("/")) return <Link href={href}>{children}</Link>;
    if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    return <>{children}</>;
  };

  return (
    <section className="relative">
      <div className={`relative w-full overflow-hidden rounded-2xl shadow-soft ${aspect === "square" ? "aspect-square" : "aspect-[16/6]"} bg-gray-100`}>
        {safeSlides.map((s, i) => (
          <div
            key={s.id ?? i}
            className={`absolute inset-0 transition-opacity duration-500 ${i === idx ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== idx}
          >
            <Wrapper href={s.href}>
              <Image
                src={s.image}
                alt={s.title || "Banner"}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </Wrapper>
          </div>
        ))}

        {safeSlides.length > 1 && (
          <>
            {/* Arrows */}
            <button
              aria-label="Anterior"
              onClick={() => go(idx - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow border grid place-items-center"
            >
              ‹
            </button>
            <button
              aria-label="Siguiente"
              onClick={() => go(idx + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow border grid place-items-center"
            >
              ›
            </button>

            {/* Bullets */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
              {safeSlides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir al slide ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={`h-2 w-2 rounded-full ${i === idx ? "bg-brand" : "bg-white/80 border"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
