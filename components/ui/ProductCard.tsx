"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import TrackLink from "@/components/ui/TrackLink";
import { toR2Url } from "@/lib/img";
import { fmtPriceUYU } from "@/lib/price";

type VariantLite = {
  label: string;
  price?: number | null;
  originalPrice?: number | null;
};

type Props = {
  slug?: string;
  title: string;
  image?: any;
  price?: number | null;
  originalPrice?: number | null;
  outOfStock?: boolean;
  brand?: string | null;
  subtitle?: string | null;
  variant?: "grid" | "row" | "compact";
  variants?: VariantLite[];
};

function resolveHref(slug?: string) {
  if (!slug) return "/catalogo";
  if (slug.startsWith("/") || slug.startsWith("http")) return slug;
  return `/producto/${slug}`;
}

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

  let src: any = toR2Url(image);
  if (!src && image) {
    if (typeof image === "string") src = image;
    else if (typeof image?.url === "string") src = image.url;
    else if (typeof image?.cover === "string") src = image.cover;
    else if (typeof image?.imageUrl === "string") src = image.imageUrl;
  }

  const [selIdx, setSelIdx] = useState(() => findCheapestIndex(variants));
  const selVar = useMemo(() => {
    if (!variants?.length) return undefined;
    return variants[Math.min(selIdx, variants.length - 1)];
  }, [variants, selIdx]);

  const displayPrice =
    selVar?.price ?? (typeof price === "number" ? price : null);
  const displayOriginal =
    selVar?.originalPrice ??
    (typeof originalPrice === "number" ? originalPrice : null);

  const hasOffer =
    typeof displayPrice === "number" &&
    typeof displayOriginal === "number" &&
    displayPrice < displayOriginal;

  const Price = hasOffer ? (
    <div className="flex items-baseline gap-2">
      <span className="text-emerald-400 font-semibold">
        {fmtPriceUYU(displayPrice!)}
      </span>
      <span className="text-xs text-zinc-500 line-through">
        {fmtPriceUYU(displayOriginal!)}
      </span>
    </div>
  ) : (
    <div className="text-emerald-400 font-semibold">
      {fmtPriceUYU(displayPrice ?? displayOriginal ?? null)}
    </div>
  );

  const VariantChips =
    variants?.length ? (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {variants.slice(0, 3).map((v, i) => {
          const active = i === selIdx;
          return (
            <span
              key={v.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelIdx(i);
              }}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] border transition
                ${
                  active
                    ? "bg-emerald-500 text-black border-emerald-400"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                }`}
            >
              {v.label}
            </span>
          );
        })}
      </div>
    ) : null;

  return (
    <TrackLink
      href={href}
      slug={slug}
      className="block group rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-emerald-400/20 hover:ring-emerald-400/40 hover:shadow-lg transition"
    >
      <div className="relative aspect-square bg-zinc-800">
        {src && (
          <Image
            src={src}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="p-3">
        {brand && (
          <div className="text-[10px] uppercase tracking-wide text-zinc-400">
            {brand}
          </div>
        )}
        <h3 className="mt-0.5 text-sm font-medium text-white line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[12px] text-zinc-400 line-clamp-1">
            {subtitle}
          </p>
        )}
        <div className="mt-1">{Price}</div>
        {VariantChips}
      </div>
    </TrackLink>
  );
}
