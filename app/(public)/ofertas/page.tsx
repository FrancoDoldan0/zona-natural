// app/(public)/ofertas/page.tsx
export const runtime = "edge";
export const revalidate = 120;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import ProductCard from "@/components/ui/ProductCard";
import BestSellersSidebar from "@/components/landing/BestSellersSidebar";
import Link from "next/link";
import { headers } from "next/headers";
import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHoursTabs from "@/components/landing/MapHoursTabs";
import {
  normalizeProduct,
  type NormalizedProduct,
} from "@/lib/product";

/* ================= helpers base ================= */

async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  if (base) return `${base}${path}`;

  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host =
      h.get("x-forwarded-host") ??
      h.get("host") ??
      h.get("X-Host") ??
      "";
    if (host) return `${proto}://${host}${path}`;
  } catch {
    // en edge puede fallar headers(), devolvemos relativo
  }
  return path;
}

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) return null as any;
    return (await res.json()) as T;
  } catch {
    return null as any;
  }
}

/* ================= fetch de todas las ofertas ================= */

type Raw = Record<string, any>;

async function fetchAllOffers(): Promise<NormalizedProduct[]> {
  // Traemos sólo productos en oferta (onSale=1)
  const url = await abs(
    `/api/public/catalogo?perPage=500&status=all&onSale=1&sort=-id`,
  );
  const data = await safeJson<any>(url);

  const raw: Raw[] =
    (data?.items as Raw[]) ??
    (data?.data as Raw[]) ??
    (Array.isArray(data) ? (data as Raw[]) : []);

  if (!raw?.length) return [];

  const normalized = raw.map((p) => normalizeProduct(p));

  // Filtro de seguridad: sólo donde price < originalPrice
  const offers = normalized.filter((p) => {
    const price =
      typeof p.price === "number" ? p.price : null;
    const orig =
      typeof p.originalPrice === "number"
        ? p.originalPrice
        : null;
    return price != null && orig != null && price < orig;
  });

  // Ordenamos por % de descuento (mayor primero)
  offers.sort((a, b) => {
    const ap =
      typeof a.price === "number" ? a.price : null;
    const ao =
      typeof a.originalPrice === "number"
        ? a.originalPrice
        : null;
    const bp =
      typeof b.price === "number" ? b.price : null;
    const bo =
      typeof b.originalPrice === "number"
        ? b.originalPrice
        : null;

    const da =
      ao && ap && ao > 0 && ap < ao ? 1 - ap / ao : 0;
    const db =
      bo && bp && bo > 0 && bp < bo ? 1 - bp / bo : 0;

    return db - da;
  });

  return offers;
}

/* ================= Opiniones inline ================= */

function OpinionsStrip() {
  const items = [
    {
      q: "Me asesoraron súper bien y encontré todo para mis recetas. ¡Llegó rapidísimo!",
      a: "Natalia",
    },
    {
      q: "Gran variedad y precios claros. Volveré a comprar.",
      a: "Rodrigo",
    },
    { q: "La atención es excelente, súper recomendables.", a: "María" },
  ];
  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-emerald-100 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((it, i) => (
            <figure
              key={i}
              className="rounded-xl ring-1 ring-emerald-100 bg-emerald-50/40 p-3"
            >
              <blockquote className="text-sm text-gray-800">
                “{it.q}”
              </blockquote>
              <figcaption className="mt-2 text-xs text-gray-600">
                — {it.a}{" "}
                <span className="ml-2 text-emerald-600">
                  ★★★★★
                </span>
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

/* ================= Página Ofertas ================= */

export default async function OffersPage() {
  const offers = await fetchAllOffers();

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Ofertas
          </h1>
          <Link
            href="/catalogo"
            className="text-emerald-700 hover:underline"
          >
            Volver al catálogo
          </Link>
        </div>

        {/* Layout con sidebar de “Más vendidos” */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <BestSellersSidebar />

          <section aria-label="Listado de ofertas">
            {offers.length === 0 ? (
              <p className="text-gray-600">
                Por ahora no hay ofertas activas. Volvé más tarde 🙂
              </p>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {offers.map((p) => (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    title={p.title}
                    image={p.image}
                    price={
                      typeof p.price === "number"
                        ? p.price
                        : undefined
                    }
                    originalPrice={
                      typeof p.originalPrice === "number"
                        ? p.originalPrice
                        : undefined
                    }
                    outOfStock={p.outOfStock}
                    brand={p.brand ?? undefined}
                    subtitle={p.subtitle ?? undefined}
                    variants={p.variants}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Opiniones */}
        <OpinionsStrip />

        {/* Ubicaciones */}
        <section className="mt-10">
          <div className="border-0 ring-0 shadow-none bg-transparent rounded-none">
            <MapHoursTabs />
          </div>
        </section>

        {/* Recetas populares */}
        <section className="mt-10">
          <RecipesPopular />
        </section>
      </main>
    </>
  );
}
