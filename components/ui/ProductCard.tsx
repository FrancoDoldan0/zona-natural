import Image from "next/image";
import Link from "next/link";

export default function ProductCard({
  slug,
  title,
  price,
  image,
  outOfStock,
}: {
  slug?: string;
  title: string;
  price?: number;
  image?: string;
  outOfStock?: boolean;
}) {
  const href =
    slug && slug !== "#"
      ? (slug.startsWith("/") || slug.startsWith("http") ? slug : `/productos/${slug}`)
      : "/productos";

  return (
    <Link href={href} className="block group">
      <div className="relative aspect-square rounded-2xl overflow-hidden border">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized // <- clave para CF Pages + R2
            draggable={false}
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
        {price != null && (
          <p className="text-brand font-semibold">
            ${Intl.NumberFormat("es-UY").format(price)}
          </p>
        )}
      </div>
    </Link>
  );
}
