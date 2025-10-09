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
  n == null
    ? "-"
    : new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(n);

export default function OffersCarousel({ items }: { items: Item[] }) {
  if (!items?.length) return null;

  const top = items.slice(0, 8);

  return (
    <section className="bg-white" aria-label="Ofertas destacadas">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold">Las Mejores Ofertas</h2>
          <Link href="/catalogo" className="text-emerald-700 hover:underline text-sm">
            Más productos »
          </Link>
        </div>

        {/* Grilla fluida: llena el ancho con tarjetas de min 260px */}
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {top.map((p) => {
            const imgObj =
              (p.images?.[0]?.url ? { url: p.images[0].url } : undefined) ??
              (p.imageUrl ? { url: p.imageUrl } : undefined) ??
              null;

            const src = toR2Url(imgObj as any);
            const isOffer =
              p.priceFinal != null &&
              p.priceOriginal != null &&
              p.priceFinal < p.priceOriginal;

            return (
              <Link
                key={p.id}
                href={`/producto/${p.slug}`}
                className="rounded-xl ring-1 ring-emerald-100 overflow-hidden bg-white hover:shadow transition-shadow"
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
                    <span className="text-emerald-700 font-semibold">
                      {fmtUYU(p.priceFinal ?? p.priceOriginal)}
                    </span>
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
      </div>
    </section>
  );
}
