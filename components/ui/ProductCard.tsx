import Image from "next/image";
import TrackLink from "@/components/ui/TrackLink";
import { toR2Url } from "@/lib/img";
import { fmtPriceUYU, discountPercent } from "@/lib/price";

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
  /** variantes (hasta 3 se muestran como chips con su precio) */
  variants?: VariantLite[];
};

function resolveHref(slug?: string) {
  if (!slug) return "/catalogo";
  if (slug.startsWith("/") || slug.startsWith("http")) return slug;
  return `/producto/${slug}`;
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
  const pct = discountPercent(originalPrice ?? undefined, price ?? undefined);

  const Price = (
    <>
      {hasOffer ? (
        <div className="flex items-baseline gap-2">
          <span className="text-emerald-700 font-semibold">{fmtPriceUYU(price!)}</span>
          <span className="text-xs text-gray-500 line-through">{fmtPriceUYU(originalPrice!)}</span>
        </div>
      ) : (
        <div className="text-emerald-700 font-semibold">
          {fmtPriceUYU(price ?? originalPrice ?? null)}
        </div>
      )}
    </>
  );

  // Chips variantes (máx 3): label + precio vigente + (tachado si corresponde)
  const VariantChips = (variants?.length ?? 0) > 0 ? (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {variants!.slice(0, 3).map((v, i) => {
        const showOffer =
          v.price != null && v.originalPrice != null && v.price < v.originalPrice;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/40 px-2 py-0.5 text-[11px] text-emerald-900"
            title={v.label}
          >
            <span className="font-medium">{v.label}</span>
            <span className="font-semibold text-emerald-800">
              {fmtPriceUYU(v.price ?? v.originalPrice ?? null)}
            </span>
            {showOffer && (
              <span className="text-[10px] text-gray-500 line-through">
                {fmtPriceUYU(v.originalPrice!)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  ) : null;

  const trackSlug = slug?.startsWith("/") ? slug.split("/").pop() || slug : slug;

  if (variant === "row" || variant === "compact") {
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
          {hasOffer && pct != null && (
            <span
              className="absolute right-1 top-1 text-[10px] rounded-full bg-emerald-700 text-white px-1.5 py-0.5"
              aria-label={`-${pct}%`}
            >
              -{pct}%
            </span>
          )}
        </div>
        <div className="min-w-0">
          {brand && <div className="text-[11px] uppercase tracking-wide text-gray-500">{brand}</div>}
          <h3 className="text-sm line-clamp-2">{title}</h3>
          <div className="mt-0.5 text-xs">{Price}</div>
          {VariantChips}
        </div>
      </TrackLink>
    );
  }

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
        {hasOffer && pct != null && (
          <span className="absolute right-2 top-2 text-[11px] rounded-full bg-emerald-700 text-white px-2 py-0.5">
            -{pct}%
          </span>
        )}
      </div>

      <div className="p-3 space-y-1">
        {brand && <div className="text-[11px] uppercase tracking-wide text-gray-500">{brand}</div>}
        <h3 className="line-clamp-2 text-sm font-medium min-h-[2.5rem]">{title}</h3>
        {subtitle && <p className="text-[12px] text-gray-600 line-clamp-1">{subtitle}</p>}
        {Price}
        {VariantChips}
      </div>
    </TrackLink>
  );
}
