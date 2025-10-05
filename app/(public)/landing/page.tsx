export const runtime = "edge";
export const dynamic = "force-dynamic";

import Hero, { type Slide } from "@/components/site/Hero";
import ProductGrid from "@/components/site/ProductGrid";

async function fetchBanners(): Promise<Slide[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const res = await fetch(${base}/api/public/banners, { cache: "no-store" });
    const data: unknown = await res.json();

    let list: unknown = [];
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === "object") {
      if ("data" in (data as any)) list = (data as any).data;
      else if ("items" in (data as any)) list = (data as any).items;
    }

    const arr = (Array.isArray(list) ? list : []) as any[];
    return arr
      .map((b, i) => ({
        id: b.id ?? i,
        image: b.image ?? b.url ?? b.src ?? "",
        href: b.href ?? b.link ?? undefined,
        title: b.title ?? b.titulo ?? undefined,
      }))
      .filter((s) => s.image);
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const slides = await fetchBanners();

  return (
    <div className="container py-6 space-y-8">
      <Hero slides={slides} aspect="banner" />
      <ProductGrid />
    </div>
  );
}
