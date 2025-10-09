// components/landing/HeroSlider.tsx
import { toR2Url } from "@/lib/img";

export type BannerItem = {
  id: number;
  title: string;
  image?: { url?: string | null; r2Key?: string | null; key?: string | null } | string | null;
  linkUrl?: string | null;
};

export default function HeroSlider({ items }: { items: BannerItem[] }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Promociones destacadas" className="bg-white">
      <div className="relative w-full overflow-x-auto no-scrollbar snap-x snap-mandatory flex">
        {items.map((b) => {
          const src = toR2Url(b.image ?? "");
          return (
            <a key={b.id} href={b.linkUrl || "/catalogo"} className="relative w-full shrink-0 snap-center md:snap-start">
              <div className="w-screen max-w-full aspect-[16/9] md:aspect-[16/6]">
                <img
                  src={src}
                  alt={b.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-end md:items-center">
                  <div className="mx-auto max-w-7xl w-full px-4 py-6 md:py-12">
                    <h2 className="text-white text-2xl md:text-4xl font-bold drop-shadow">{b.title}</h2>
                    <div className="mt-3">
                      <span className="inline-block bg-emerald-700 text-white px-4 py-2 rounded-full text-sm md:text-base">
                        Comprar ahora
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
