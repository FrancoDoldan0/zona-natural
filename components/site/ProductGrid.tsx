import ProductCard from "@/components/ui/ProductCard";

async function fetchOffers(): Promise<any[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const res = await fetch(`${base}/api/public/offers`, { cache: "no-store" });
    const data: any = await res.json();
    const list = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default async function ProductGrid() {
  const products = await fetchOffers();
  if (!products.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Ofertas</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p: any, i: number) => (
          <ProductCard
            key={p.id ?? p.slug ?? i}
            slug={p.slug ?? p.url ?? "#"}
            title={p.name ?? p.title ?? "Producto"}
            price={p.price ?? p.precio}
            image={p.image ?? p.images?.[0]?.url ?? p.img ?? ""}
            outOfStock={p.stock === 0 || p.outOfStock}
          />
        ))}
      </div>
    </section>
  );
}
