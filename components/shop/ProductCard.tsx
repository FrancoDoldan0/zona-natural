type Item = {
  id?: number | string;
  slug?: string;
  name?: string;
  title?: string;
  price?: number;
  compareAtPrice?: number | null;
  stock?: number | boolean;
  images?: { url?: string }[];
  image?: string;
};

function money(v: number | undefined | null, currency = "UYU") {
  if (v == null) return "";
  return v.toLocaleString("es-UY", { style: "currency", currency });
}

export default function ProductCard({ item }: { item: Item }) {
  const href = item.slug ? `/productos/${item.slug}` : "#";
  const img =
    item.images?.[0]?.url || item.image || "https://placehold.co/600x600?text=Producto";
  const inStock = typeof item.stock === "boolean" ? item.stock : (item.stock ?? 0) > 0;

  return (
    <a href={href} className="group block rounded-2xl border overflow-hidden hover:shadow-soft transition-shadow">
      <div className="aspect-square bg-white overflow-hidden">
        <img
          src={img}
          alt={item.name || item.title || "Producto"}
          className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="p-3 space-y-1.5">
        <div className="text-sm line-clamp-2 min-h-[2.5rem]">{item.name || item.title}</div>

        <div className="flex items-baseline gap-2">
          <div className="text-base font-semibold text-ink-900">
            {money(item.price)}
          </div>
          {item.compareAtPrice && item.compareAtPrice > (item.price ?? 0) && (
            <div className="text-xs line-through text-ink-500">
              {money(item.compareAtPrice)}
            </div>
          )}
        </div>

        {!inStock && (
          <div className="inline-flex px-2 py-0.5 rounded-full text-xs border text-ink-700">
            Sin stock
          </div>
        )}
      </div>
    </a>
  );
}
