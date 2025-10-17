import Image from "next/image";
import TrackLink from "@/components/ui/TrackLink";
import { toR2Url } from "@/lib/img";
import { fmtPriceUYU } from "@/lib/price";

type VariantLite = {
  label: string;
  price?: number | null;          // precio vigente para esa variante
  originalPrice?: number | null;  // tachado si corresponde
};

type Props = {
  slug?: string;           // "tomate" o "/producto/tomate" o URL completa
  title: string;
  image?: any;
  price?: number | null;
  originalPrice?: number | null;
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
  variant?: "grid" | "row" | "compact";
  /** variantes (hasta 3 se muestran como chips con su label) */
  variants?: VariantLite[];
};

function resolveHref(slug?: string) {
  if (!slug) return "/catalogo";
  if (slug.startsWith("/") || slug.startsWith("http")) return slug;
  return `/producto/${slug}`;
}

// índice de la variante más barata (para resaltarla)
function findCheapestIndex(variants: VariantLite[] | undefined) {
  if (!variants?.length) return -1;
  let idx = 0;
  let best = Number.POSITIVE_INFINITY;
  variants.slice(0, 3).forEach((v, i) => {
    const val = v.price ?? v.originalPrice ?? null;
    const n = typeof val === "number" ? val : Number.POSITIVE_INFINITY;
    if (n < best) {
      best = n;
      idx = i;
    }
  });
  return idx;
}

export default function ProductCard({
  slug,
  title,
  image,
  price,
  originalPrice,
  outOfStock,
  brand,
  subtitle,
  variant = "grid",
  variants,
}: Props) {
  const href = resolveHref(slug);
  const src = toR2Url(image);
  const hasOffer =
    typeof price === "number" &&
    typeof originalPrice === "number" &&
    price < originalPrice;

  const Price = (
    <>
      {hasOffer ? (
        <div className="flex items-baseline gap-2">
          <span className="text-emerald-700 font-semibold">{fmtPriceUYU(price!)}</span>
          <span className="text-xs text-gray-500 line-through">
            {fmtPriceUYU(originalPrice!)}
          </span>
        </div>
      ) : (
        <div className="text-emerald-700 font-semibold">
          {fmtPriceUYU(price ?? originalPrice ?? null)}
        </div>
      )}
    </>
  );

  // Chips de variantes (máx 3) — solo label; la más barata resaltada
  const cheapestIdx = findCheapestIndex(variants);
  const VariantChips =
    (variants?.length ?? 0) > 0 ? (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {variants!.slice(0, 3).map((v, i) => {
          const isBest = i === cheapestIdx;
          return (
            <span
              key={i}
              className={
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] " +
                (isBest
                  ? "bg-black text-white"
                  : "bg-white text-gray-900 border border-gray-200")
              }
              title={v.label}
            >
              {v.label}
            </span>
          );
        })}
      </div>
    ) : null;

  const trackSlug = slug?.startsWith("/") ? slug.split("/").pop() || slug : slug;

  if (variant === "row" || variant === "compact") {
    // estilo “row” modernizado para parecerse a la primera captura
    return (
      <TrackLink
        href={href}
        slug={trackSlug}
        className="lift flex gap-3 rounded-xl ring-1 ring-emerald-100 p-2 bg-white hover:shadow"
      >
        <div className="shrink-0 w-16 h-16 rounded overflow-hidden bg-emerald-50 relative">
          {src ? (
            <Image
              src={src}
              alt={title}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
          {outOfStock && (
            <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
              Agotado
            </span>
          )}
        </div>

        <div className="min-w-0">
          {brand && (
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {brand}
            </div>
          )}
          <h3 className="text-sm line-clamp-2">{title}</h3>
          <div className="mt-1 text-xs">{Price}</div>
          {VariantChips}
        </div>
      </TrackLink>
    );
  }

  // estilo “grid” como la primera captura
  return (
    <TrackLink
      href={href}
      slug={trackSlug}
      className="lift block group rounded-2xl ring-1 ring-emerald-100 overflow-hidden bg-white hover:shadow"
    >
      <div className="relative aspect-square bg-emerald-50">
        {src ? (
          <Image
            src={src}
            alt={title}
            fill
            sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}

        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="p-3">
        {brand && (
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            {brand}
          </div>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium min-h-[2.5rem]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[12px] text-gray-600 line-clamp-1">{subtitle}</p>
        )}
        <div className="mt-1">{Price}</div>
        {VariantChips}
      </div>
    </TrackLink>
  );
}
