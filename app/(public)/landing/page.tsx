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

/** Prefija keys/paths con PUBLIC_R2_BASE_URL si no es URL absoluta */
function resolveImage(raw?: string): string {
  const R2 = (process.env.PUBLIC_R2_BASE_URL || "").replace(/\/+$/, "");
  const v = (raw || "").toString();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return R2 ? `${R2}/${v.replace(/^\/+/, "")}` : v; // último recurso: relativo
}

async function fetchBanners(): Promise<Slide[]> {
  try {
    const res = await fetch(await abs("/api/public/banners"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];

    const data: any = await res.json();
    const list =
      Array.isArray(data)
        ? data
        : (data?.items ?? data?.data ?? data?.rows ?? []);

    return (Array.isArray(list) ? list : []).map((b: any, i: number) => {
      const image =
        resolveImage(
          b.image ?? b.imageUrl ?? b.url ?? b.src ?? b.preview ?? b.key ?? b.r2Key
        ) || "";

      const href = b.linkUrl ?? b.href ?? b.link ?? undefined;

      return {
        id: b.id ?? b._id ?? i,
        image,
        href,
        title: b.title ?? b.name ?? "",
      } as Slide;
    }).filter(s => !!s.image); // evita slides vacíos
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
        <h2 className="text-lg font-semibold">Las mejores ofertas</h2>
        <ProductGrid />
      </section>
    </div>
  );
}
