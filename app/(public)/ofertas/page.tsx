// app/(public)/ofertas/page.tsx
export const runtime = "edge";
export const revalidate = 120;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import ProductCard from "@/components/ui/ProductCard";
import BestSellersSidebar from "@/components/landing/BestSellersSidebar";
import { normalizeProduct } from "@/lib/product";
import Link from "next/link";
import { headers } from "next/headers";
import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHoursTabs from "@/components/landing/MapHoursTabs"; // ← usa el bloque con 4 sucursales

/* ───────── helpers URL/JSON ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? h.get("X-Host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {}
  return path;
}
async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) return null as any;
    return (await res.json()) as T;
  } catch {
    return null as any;
  }
}

/* ───────── fetch ofertas ───────── */
type Raw = Record<string, any>;
async function fetchOffers(): Promise<Raw[]> {
  const guesses = ["offers=1", "hasDiscount=1", "onSale=1"];
  for (const qp of guesses) {
    const data = await safeJson<any>(await abs(`/api/public/catalogo?perPage=200&status=all&${qp}`));
    const items: Raw[] =
      (data?.items as Raw[]) ?? (data?.data as Raw[]) ?? (Array.isArray(data) ? (data as Raw[]) : []);
    if (Array.isArray(items) && items.length) return items;
  }
  const data = await safeJson<any>(await abs(`/api/public/catalogo?perPage=200&status=all&sort=-id`));
  const all: Raw[] =
    (data?.items as Raw[]) ?? (data?.data as Raw[]) ?? (Array.isArray(data) ? (data as Raw[]) : []);
  return all;
}

/* ───────── Opiniones simples (inline) ───────── */
function OpinionsStrip() {
  const items = [
    { q: "Me asesoraron súper bien y encontré todo para mis recetas. ¡Llegó rapidísimo!", a: "Natalia" },
    { q: "Gran variedad y precios claros. Volveré a comprar.", a: "Rodrigo" },
    { q: "La atención es excelente, súper recomendables.", a: "María" },
  ];
  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((it, i) => (
            <figure key={i} className="rounded-xl ring-1 ring-emerald-100 bg-emerald-50/40 p-3">
              <blockquote className="text-sm text-gray-800">“{it.q}”</blockquote>
              <figcaption className="mt-2 text-xs text-gray-600">
                — {it.a} <span className="ml-2 text-emerald-600">★★★★★</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-3">
          <a
            href="https://www.google.com/search?q=Zona+Natural+Las+Piedras+opiniones"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full px-3 py-1.5 text-sm ring-1 ring-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Ver opiniones en Google
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────── Página Ofertas ───────── */
export default async function OffersPage() {
  const raw = await fetchOffers();
  const normalized = raw.map(normalizeProduct);

  const offers = normalized.filter((p) => {
    const final = typeof p.price === "number" ? p.price : null;
    const orig = typeof p.originalPrice === "number" ? p.originalPrice : null;
    return final != null && orig != null && final < orig;
  });

  // Ordenar por mayor % dto.
  offers.sort((a, b) => {
    const da = (a.originalPrice ?? 0) && (a.price ?? 0) ? 1 - a.price! / a.originalPrice! : 0;
    const db = (b.originalPrice ?? 0) && (b.price ?? 0) ? 1 - b.price! / b.originalPrice! : 0;
    return db - da;
  });

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Ofertas</h1>
          <Link href="/catalogo" className="text-emerald-700 hover:underline">
            Volver al catálogo
          </Link>
        </div>

        {/* Layout con sidebar de “Más vendidos” */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <BestSellersSidebar />

          <section aria-label="Listado de ofertas" className="rounded-2xl">
            {offers.length === 0 ? (
              <p className="text-gray-600">Por ahora no hay ofertas activas. Volvé más tarde 🙂</p>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {offers.map((p) => (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    title={p.title}
                    image={p.image}
                    price={typeof p.price === "number" ? p.price : undefined}
                    originalPrice={typeof p.originalPrice === "number" ? p.originalPrice : undefined}
                    outOfStock={p.outOfStock}
                    brand={p.brand ?? undefined}
                    subtitle={p.subtitle ?? undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Opiniones */}
        <OpinionsStrip />

        {/* Ubicaciones (versión con 4 sucursales, igual a la landing) */}
        <section className="mt-10">
          <MapHoursTabs />
        </section>

        {/* Recetas populares */}
        <section className="mt-10">
          <RecipesPopular />
        </section>
      </main>
    </>
  );
}
