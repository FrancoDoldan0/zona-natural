export const runtime = "edge";

import Hero, { type Slide } from "@/components/site/Hero";
import ProductGrid from "@/components/site/ProductGrid";
import { headers } from "next/headers";

function makeUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) return `${base}${path}`;
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

async function fetchBanners(): Promise<Slide[]> {
  try {
    const res = await fetch(makeUrl("/api/public/banners"), { cache: "no-store" });
    const data: unknown = await res.json();

    const list =
      Array.isArray(data) ? data :
      // intentamos {data}, {items}, {rows}
      (data as any)?.data ?? (data as any)?.items ?? (data as any)?.rows ?? [];

    return (Array.isArray(list) ? list : []).map((b: any, i: number) => ({
      id: b.id ?? b._id ?? i,
      image: b.image ?? b.url ?? b.src ?? "",
      href: b.href ?? b.link ?? undefined,
      title: b.title ?? b.name ?? "",
    }));
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const slides = await fetchBanners();

  return (
    <div className="container py-6 space-y-10">
      <Hero slides={slides} aspect="banner" />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ofertas activas</h2>
        <ProductGrid />
      </section>
    </div>
  );
}
