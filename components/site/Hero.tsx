// components/site/Hero.tsx
export const runtime = "edge";

import Image from "next/image";

export type Slide = {
  id: string | number;
  image: string;
  href?: string;
  title?: string;
};

export default function Hero({
  slides,
  aspect = "banner",
}: {
  slides: Slide[];
  aspect?: "banner" | "square";
}) {
  if (!slides || slides.length === 0) {
    // placeholder visual si no hay banners
    return (
      <div className="rounded-2xl overflow-hidden shadow-soft w-full aspect-[21/9] sm:aspect-[21/7] bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
        <span className="text-xl font-semibold">Zona Natural</span>
      </div>
    );
  }

  const ratio = aspect === "banner" ? "aspect-[21/9] sm:aspect-[21/7]" : "aspect-[1/1]";

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-soft w-full ${ratio}`}>
      {/* h-full asegura alto para que <Image fill /> tenga contenedor */}
      <div className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {slides.map((s, i) => {
          const slideInner = s.image ? (
            <Image
              src={s.image}
              alt={s.title ?? ""}
              fill
              sizes="100vw"
              className="object-cover"
              priority={i === 0}
              unoptimized // <- forzamos carga directa desde R2
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
              <span className="text-xl font-semibold">{s.title ?? "Zona Natural"}</span>
            </div>
          );

          // min-w-full + h-full: cada slide ocupa todo el ancho y alto
          const card = (
            <div key={String(s.id)} className="relative min-w-full h-full shrink-0 snap-center">
              {slideInner}
            </div>
          );

          return s.href ? (
            <a key={String(s.id)} href={s.href} className="block w-full h-full">
              {card}
            </a>
          ) : (
            card
          );
        })}
      </div>
    </div>
  );
}
