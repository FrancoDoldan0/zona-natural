// components/landing/OffersCarousel.tsx
import { toR2Url } from "@/lib/img";
import Link from "next/link";

type Item = {
  id: number;
  name: string;
  slug: string;
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  appliedOffer?: any | null;
  offer?: any | null;
};

function fmt(n: number | null) {
  if (n == null) return "-";
  return "$ " + n.toFixed(2).replace(".", ",");
}

export default function OffersCarousel({ items }: { items: Item[] }) {
  if (!items?.length) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Las mejores ofertas</h2>

        <div className="relative -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-4">
            {items.map((p) => {
              const img = p.images?.[0]?.url ? { url: p.images[0].url } : p.imageUrl || null;
              const src = toR2Url(img as any);
              const isOffer =
                p.priceFinal != null &&
                p.priceOriginal != null &&
                p.priceFinal < p.priceOriginal;

              return (
                <Link
                  key={p.id}
                  href={`/producto/${p.slug}`}
                  className="w-44 shrink-0 rounded-lg ring-1 ring-emerald-100 overflow-hidden bg-white hover:shadow"
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
                    ) : null}
                    {isOffer ? (
                      <span className="absolute top-2 left-2 text-[11px] rounded-full bg-emerald-700 text-white px-2 py-0.5">
                        Oferta
                      </span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-emerald-700 font-semibold">{fmt(p.priceFinal)}</span>
                      {isOffer ? (
                        <span className="text-xs text-gray-500 line-through">{fmt(p.priceOriginal)}</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
