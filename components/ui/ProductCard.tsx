"use client";

import { useMemo, useState } from "react";
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

// índice de la variante más barata (de las primeras 3)
function findCheapestIndex(vs?: VariantLite[]) {
  if (!vs?.length) return 0;
  let idx = 0;
  let best = Number.POSITIVE_INFINITY;
  vs.slice(0, 3).forEach((v, i) => {
    const val = v.price ?? v.originalPrice;
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

  // 🔧 NUEVO: hacemos toR2Url(image) pero con fallback a cualquier string útil
  let src: any = toR2Url(image);
  if (!src && image) {
    if (typeof image === "string" && image.trim().length) {
      src = image;
    } else if (typeof image === "object") {
      if (typeof image.url === "string" && image.url.trim().length) {
        src = image.url;
      } else if (
        typeof (image as any).cover === "string" &&
        (image as any).cover.trim().length
      ) {
        src = (image as any).cover;
      } else if (
        typeof (image as any).imageUrl === "string" &&
        (image as any).imageUrl.trim().length
      ) {
        src = (image as any).imageUrl;
      }
    }
  }

  // --- Selección de variante ---
  const [selIdx, setSelIdx] = useState(() => findCheapestIndex(variants));
  const selVar = useMemo(() => {
    if (!variants?.length) return undefined;
    const i = Math.min(Math.max(selIdx, 0), variants.length - 1);
    return variants[i];
  }, [variants, selIdx]);

  // Precios a mostrar: priorizamos la variante seleccionada
  const displayPrice =
    (typeof selVar?.price === "number" ? selVar?.price : null) ??
    (typeof price === "number" ? price : null);
  const displayOriginal =
    (typeof selVar?.originalPrice === "number" ? selVar?.originalPrice : null) ??
    (typeof originalPrice === "number" ? originalPrice : null);

  const hasOffer =
    typeof displayPrice === "number" &&
    typeof displayOriginal === "number" &&
    displayPrice < displayOriginal;

  const Price = (
    <>
      {hasOffer ? (
        <div className="flex items-baseline gap-2">
          <span className="text-emerald-700 font-semibold">
            {fmtPriceUYU(displayPrice!)}
          </span>
          <span className="text-xs text-gray-500 line-through">
            {fmtPriceUYU(displayOriginal!)}
          </span>
        </div>
      ) : (
        <div className="text-emerald-700 font-semibold">
          {fmtPriceUYU(displayPrice ?? displayOriginal ?? null)}
        </div>
      )}
    </>
  );

  // Chips variantes (máx 3): solo label; cambian el precio mostrado
  const VariantChips =
    (variants?.length ?? 0) > 0 ? (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {variants!.slice(0, 3).map((v, i) => {
          const active = selVar && i === Math.min(selIdx, variants!.length - 1);
          return (
            <span
              key={`${v.label}-${i}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // evita navegar al tocar dentro del link
                setSelIdx(i);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelIdx(i);
                }
              }}
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] border transition",
                active
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
              aria-pressed={active}
              aria-label={v.label}
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
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
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

  // estilo “grid” (como tu primera captura)
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
