// app/(public)/landing/page.tsx
export const runtime = "edge";

import Hero, { type Slide } from "@/components/site/Hero";
import ProductGrid from "@/components/site/ProductGrid";
import { headers } from "next/headers";

/**
 * Construye una URL absoluta válida en Edge/Cloudflare.
 * - Si NEXT_PUBLIC_BASE_URL está definida, la usa.
 * - Si el path ya es absoluto, lo devuelve tal cual.
 * - Si no, arma proto://host a partir de x-forwarded-* (fallback a host).
 */
async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  // En Cloudflare Pages (next-on-pages) headers() puede ser Promise<ReadonlyHeaders>
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

async function fetchBanners(): Promise<Slide[]> {
  try {
    const res = await fetch(await abs("/api/public/banners"), {
      // Podés ajustar a revalidate: 60 si preferís ISR en vez de no-store
      cache: "no-store",
    });
    const data: unknown = await res.json();

    const list =
      Array.isArray(data)
        ? data
        : // intentamos {data}, {items}, {rows}
          (data as any)?.data ??
          (data as any)?.items ??
          (data as any)?.rows ??
          [];

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
