// components/public/BannerSlider.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Banner = {
  id: number;
  // soportamos ambos nombres de campos
  title?: string;
  imageUrl?: string; // shape anterior
  url?: string;      // shape nuevo
  link?: string | null;     // shape anterior
  linkUrl?: string | null;  // shape nuevo
};

export default function BannerSlider({
  items,
  interval = 4000,
}: {
  items: Banner[];
  interval?: number;
}) {
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);

  const len = Array.isArray(items) ? items.length : 0;

  const stop = () => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const start = () => {
    stop();
    if (len > 1) {
      timer.current = window.setInterval(() => {
        setI((v) => ((v + 1) % len));
      }, Math.max(1200, interval)); // evitamos intervalos demasiado cortos
    }
  };

  // Reiniciar/pausar autoplay cuando cambian cantidad o intervalo
  useEffect(() => {
    if (len > 1) {
      start();
      return stop;
    }
    stop();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len, interval]);

  // Asegurar que el índice sea válido si cambia la lista
  useEffect(() => {
    if (i >= len) setI(0);
  }, [i, len]);

  if (!len) return null;

  const cur = items[i]!;
  const href = (cur.link ?? cur.linkUrl) || '#';
  const title = cur.title || 'Banner';
  const rawSrc = cur.imageUrl ?? cur.url ?? '';
  const src = rawSrc && (/^(?:https?:)?\/\//i.test(rawSrc) || rawSrc.startsWith('/'))
    ? rawSrc
    : rawSrc
      ? `/${rawSrc}`
      : '/placeholder.jpg';

  return (
    <div
      className="relative rounded overflow-hidden"
      onMouseEnter={stop}
      onMouseLeave={start}
    >
      <a href={href} aria-label={title}>
        <div className="aspect-[16/9] bg-black/5">
          <img
            src={src}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.dataset.fallbackApplied === '1') return;
              img.dataset.fallbackApplied = '1';
              img.src = '/placeholder.jpg';
            }}
          />
        </div>
      </a>

      {len > 1 && (
        <>
          <button
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded"
            onClick={() => setI((v) => (v - 1 + len) % len)}
          >
            ‹
          </button>
          <button
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 py-1 rounded"
            onClick={() => setI((v) => (v + 1) % len)}
          >
            ›
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Slide ${idx + 1}`}
                className={'h-2 w-2 rounded-full ' + (idx === i ? 'bg-white' : 'bg-white/50')}
                onClick={() => setI(idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
