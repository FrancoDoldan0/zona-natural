export const runtime = "edge";

import Link from "next/link";
import ProductCard from "@/components/ui/ProductCard";

async function fetchOffers(): Promise<any[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const res = await fetch(\\/api/public/offers\, { cache: "no-store" });
    const data: unknown = await res.json();

    let list: unknown = [];
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === "object") {
      if ("data" in (data as any)) list = (data as any).data;
      else if ("items" in (data as any)) list = (data as any).items;
    }
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default async function ProductGrid() {
  const items = await fetchOffers();
  if (!items.length) return null;

  return (
    <section className="container my-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Destacados</h2>
        <Link href="/productos" className="text-sm text-brand hover:underline">Ver todos</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.slice(0, 12).map((p: any, i: number) => (
          <ProductCard key={p.id ?? i} product={p} />
        ))}
      </div>
    </section>
  );
}
