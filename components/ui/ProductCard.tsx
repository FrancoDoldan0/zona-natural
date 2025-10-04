import Image from "next/image";
import Link from "next/link";

type AnyProduct = Record<string, any>;

function pickImg(p: AnyProduct): string {
  return (
    p.imageUrl ??
    p.image ??
    p.img ??
    p.images?.[0]?.url ??
    (typeof p.images?.[0] === "string" ? p.images[0] : "") ??
    ""
  );
}

function pickTitle(p: AnyProduct): string {
  return p.name ?? p.title ?? p.titulo ?? "Producto";
}

function pickSlug(p: AnyProduct): string | null {
  return p.slug ?? p.handle ?? (p.id ? String(p.id) : null);
}

function pickPrice(p: AnyProduct): { price: number; compareAt?: number } {
  const price =
    Number(p.price ?? p.precio ?? p.price_final ?? p.priceFinal ?? 0) || 0;
  const compareAt =
    Number(p.compare_at_price ?? p.price_old ?? p.precio_lista ?? 0) || undefined;
  return { price, compareAt };
}

function isOutOfStock(p: AnyProduct): boolean {
  if (typeof p.inStock === "boolean") return !p.inStock;
  if (typeof p.stock === "number") return p.stock <= 0;
  return false;
}

export default function ProductCard({ product }: { product: AnyProduct }) {
  const img = pickImg(product);
  const title = pickTitle(product);
  const slug = pickSlug(product);
  const { price, compareAt } = pickPrice(product);
  const soldOut = isOutOfStock(product);

  const href = slug ? \/productos/\\ : "/productos";

  return (
    <Link
      href={href}
      className="group block rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-soft transition-shadow"
    >
      <div className="relative aspect-square bg-gray-100">
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
          />
        ) : null}

        {soldOut && (
          <span className="absolute left-2 top-2 text-[11px] font-semibold uppercase tracking-wide bg-gray-900 text-white px-2 py-1 rounded-full">
            Sin stock
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm leading-tight min-h-[2.5rem] overflow-hidden">
          {title}
        </h3>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-semibold">
            {price.toLocaleString("es-UY", { style: "currency", currency: "UYU" })}
          </span>
          {compareAt && compareAt > price ? (
            <span className="text-xs text-ink-500 line-through">
              {compareAt.toLocaleString("es-UY", { style: "currency", currency: "UYU" })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
