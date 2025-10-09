// components/landing/OffersCarousel.tsx
import { toR2Url } from "@/lib/img";
import Link from "next/link";

type Item = {
  id: number;
  name: string;
  slug: string;
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url?: string; alt?: string | null }[];
  imageUrl?: string | null;
  appliedOffer?: any | null;
  offer?: any | null;
};

const fmtUYU = (n: number | null) =>
  n == null ? "-" : new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(n);

export default function OffersCarousel({ items }: { items: Item[] }) {
  if (!items?.length) return null;

  return (
    <section className="bg-white" aria-label="Ofertas destacadas">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Las mejores ofertas</h2>

        <div className="relative -mx-4 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="flex gap-4">
            {items.map((p) => {
              const imgObj =
                (p.images?.[0]?.url ? { url: p.images[0].url } : undefined) ??
                (p.imageUrl ? { url: p.imageUrl } : undefined) ??
                null;

              const src = toR2Url(imgObj as any);
              const isOffer =
                p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal;

              return (
                <Link
                  key={p.id}
                  href={`/producto/${p.slug}`}
                  className="snap-start w-48 md:w-56 shrink-0 rounded-xl ring-1 ring-emerald-100 overflow-hidden bg-white hover:shadow transition-shadow"
                >
                  <div className="relative aspect-square bg-emerald-50">
                    {src ? (
                      <img
                        src={src}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                    {isOffer && (
                      <span className="absolute top-2 left-2 text-[11px] rounded-full bg-emerald-700 text-white px-2 py-0.5">
                        Oferta
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>

                    <div className="mt-1 flex items-baseline gap-2">
                      {/* Si hay precioFinal, lo mostramos; sino mostramos el original */}
                      <span className="text-emerald-700 font-semibold">
                        {fmtUYU(p.priceFinal ?? p.priceOriginal)}
                      </span>

                      {/* Precio original tachado sólo si hay descuento real */}
                      {isOffer && (
                        <span className="text-xs text-gray-500 line-through">
                          {fmtUYU(p.priceOriginal)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bordes de desvanecido para sugerir scroll (decorativo, no bloquea interacción) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 from-white to-transparent bg-gradient-to-r" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 from-transparent to-white bg-gradient-to-l" />
        </div>
      </div>
    </section>
  );
}
