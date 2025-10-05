export const runtime = "edge";

import Hero, { type Slide } from "@/components/site/Hero";
import ProductGrid from "@/components/site/ProductGrid";

async function fetchBanners(): Promise<Slide[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const res = await fetch(`${base}/api/public/banners`, { cache: "no-store" });
    const data: any = await res.json();
    const list = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
    return (Array.isArray(list) ? list : []).map((b: any, i: number) => ({
      id: b.id ?? b._id ?? i,
      image: b.image ?? b.url ?? "",
      href: b.href ?? b.link ?? undefined,
      title: b.title ?? b.name ?? "",
    }));
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const slides = await fetchBanners();
  const heroSlides = slides.length
    ? slides
    : [{ id: "ph", image: "", title: "Zona Natural" }];

  return (
    <div className="container py-6 space-y-10">
      <Hero slides={heroSlides} aspect="banner" />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ofertas activas</h2>
        {/* ProductGrid ya consulta /api/public/offers y muestra mensaje si está vacío */}
        <ProductGrid />
      </section>
    </div>
  );
}
