// app/(public)/ofertas/page.tsx
export const runtime = "edge";
export const revalidate = 120;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";
import Link from "next/link";
import { headers } from "next/headers";

async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
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

type Raw = Record<string, any>;

async function fetchOffers(): Promise<Raw[]> {
  // 1) Intento con un posible filtro nativo
  const guessParams = [
    "offers=1",
    "hasDiscount=1",
    "onSale=1",
  ];
  for (const qp of guessParams) {
    const data = await safeJson<any>(await abs(`/api/public/catalogo?perPage=120&status=all&${qp}`));
    const items: Raw[] =
      (data?.items as Raw[]) ?? (data?.data as Raw[]) ?? (Array.isArray(data) ? data as Raw[] : []);
    if (Array.isArray(items) && items.length) return items;
  }

  // 2) Fallback: traigo un lote y filtro en servidor (edge)
  const data = await safeJson<any>(await abs(`/api/public/catalogo?perPage=200&status=all&sort=-id`));
  const all: Raw[] =
    (data?.items as Raw[]) ?? (data?.data as Raw[]) ?? (Array.isArray(data) ? data as Raw[] : []);
  return all;
}

export default async function OffersPage() {
  const raw = await fetchOffers();
  const normalized = raw.map(normalizeProduct);

  // Filtrar con descuento real
  const offers = normalized.filter((p) => {
    const final = typeof p.price === "number" ? p.price : null;
    const orig = typeof p.originalPrice === "number" ? p.originalPrice : null;
    return final != null && orig != null && final < orig;
  });

  // Orden: mayor % de descuento primero
  offers.sort((a, b) => {
    const da = (a.originalPrice ?? 0) && (a.price ?? 0) ? 1 - (a.price! / a.originalPrice!) : 0;
    const db = (b.originalPrice ?? 0) && (b.price ?? 0) ? 1 - (b.price! / b.originalPrice!) : 0;
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
          <Link href="/catalogo" className="text-emerald-700 hover:underline">Volver al catálogo</Link>
        </div>

        {offers.length === 0 ? (
          <p className="mt-6 text-gray-600">Por ahora no hay ofertas activas. Volvé más tarde 🙂</p>
        ) : (
          <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {offers.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                title={p.title}
                image={p.image}
                price={p.price ?? undefined}
                originalPrice={p.originalPrice ?? undefined}
                outOfStock={p.outOfStock}
                brand={p.brand ?? undefined}
                subtitle={p.subtitle ?? undefined}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
