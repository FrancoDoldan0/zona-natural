// components/ui/ProductCard.tsx
import Link from "next/link";

export default function ProductCard({
  slug,
  title,
  price,
  originalPrice,
  image,
  outOfStock,
}: {
  slug?: string;
  title: string;
  price?: number;           // precio final (con descuento)
  originalPrice?: number;   // precio original (se muestra tachado si > price)
  image?: string;
  outOfStock?: boolean;
}) {
  const href =
    slug && slug !== "#"
      ? slug.startsWith("/") || slug.startsWith("http")
        ? slug
        : `/productos/${slug}`
      : "/productos";

  const fmt = (n: number) => `$${Intl.NumberFormat("es-UY").format(n)}`;
  const showStrike = typeof originalPrice === "number" && typeof price === "number" && originalPrice > price;

  return (
    <Link href={href} className="block group">
      <div className="relative aspect-square rounded-2xl overflow-hidden border">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            Sin stock
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="line-clamp-2 text-sm font-medium">{title}</h3>

        {/* Precios */}
        {typeof price === "number" ? (
          <div className="flex items-baseline gap-2">
            {showStrike && (
              <span className="text-xs text-ink-400 line-through">
                {fmt(originalPrice!)}
              </span>
            )}
            <span className="text-brand font-semibold">{fmt(price)}</span>
          </div>
        ) : (
          typeof originalPrice === "number" && (
            <p className="text-brand font-semibold">{fmt(originalPrice)}</p>
          )
        )}
      </div>
    </Link>
  );
}
