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

/* ================= helpers base ================= */

async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
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

/* ================= tipos light ================= */

type SidebarOffer = {
  id: number;
  productId: number;
  discountType?: "AMOUNT" | "PERCENT" | string | null;
  discountVal?: number | null;
};

type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceFinal?: number | null;
  image?: any;
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  brand?: string | null;
  subtitle?: string | null;
  variants?: any[];
};

/* elegir imagen como en SideRails */
function firstImage(p: CatalogProduct) {
  return (
    p.cover ??
    p.coverUrl ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length ? p.images[0] : null)
  );
}

type OfferCardData = {
  id: number;
  slug: string;
  title: string;
  image: any;
  price?: number;
  originalPrice?: number;
  brand?: string;
  subtitle?: string;
  variants?: any[];
};

/* aplica el descuento de la offer al producto del catálogo */
function buildOfferCard(prod: CatalogProduct, off: SidebarOffer): OfferCardData {
  // base: si existe priceFinal lo usamos, sino price
  const basePriceRaw =
    typeof prod.priceFinal === "number"
      ? prod.priceFinal
      : typeof prod.price === "number"
      ? prod.price
      : null;

  let finalPrice = basePriceRaw;

  if (typeof basePriceRaw === "number" && off) {
    const val = Number(off.discountVal ?? NaN);
    if (!Number.isNaN(val) && val > 0) {
      if (off.discountType === "PERCENT") {
        finalPrice = Math.max(0, basePriceRaw - (basePriceRaw * val) / 100);
      } else {
        // AMOUNT u otro → restamos monto fijo
        finalPrice = Math.max(0, basePriceRaw - val);
      }
    }
  }

  return {
    id: prod.id,
    slug: prod.slug,
    title: prod.name,
    image: firstImage(prod),
    price: typeof finalPrice === "number" ? finalPrice : undefined,
    originalPrice:
      typeof basePriceRaw === "number" ? basePriceRaw : undefined,
    brand: (prod as any).brand ?? undefined,
    subtitle: (prod as any).subtitle ?? undefined,
    variants: (prod as any).variants,
  };
}

/* ================= fetch de ofertas ================= */

async function fetchOffersProducts(): Promise<OfferCardData[]> {
  // 1) Traemos las ofertas "oficiales" (tabla Offer)
  const offersUrl = await abs("/api/public/sidebar-offers?take=60");
  const offersJson = await safeJson<any>(offersUrl);
  const offers: SidebarOffer[] = Array.isArray(offersJson?.items)
    ? offersJson.items
    : [];

  if (!offers.length) return [];

  // 2) Juntamos los productId
  const ids = offers
    .map((o) => o.productId)
    .filter((id) => typeof id === "number" && id > 0);

  if (!ids.length) return [];

  // 3) Traemos solo esos productos del catálogo (para tener fotos, precios, etc.)
  const catUrl = await abs(
    `/api/public/catalogo?ids=${ids.join(",")}&status=all&perPage=${ids.length}`,
  );
  const catalogJson = await safeJson<any>(catUrl);

  const list: CatalogProduct[] =
    (catalogJson?.items as CatalogProduct[]) ??
    (catalogJson?.data as CatalogProduct[]) ??
    (Array.isArray(catalogJson) ? (catalogJson as CatalogProduct[]) : []);

  if (!list.length) return [];

  const byId = new Map<number, CatalogProduct>();
  for (const p of list) byId.set(p.id, p);

  // 4) Unimos offer + product y calculamos precios
  const result = offers
    .map((off) => {
      const prod = byId.get(off.productId);
      if (!prod) return null;
      return buildOfferCard(prod, off);
    })
    .filter(Boolean) as OfferCardData[];

  // 5) Orden: mayor % de descuento primero
  result.sort((a, b) => {
    const da =
      a.originalPrice && a.price
        ? 1 - a.price / a.originalPrice
        : 0;
    const db =
      b.originalPrice && b.price
        ? 1 - b.price / b.originalPrice
        : 0;
    return db - da;
  });

  return result;
}

/* ================= Opiniones inline ================= */

function OpinionsStrip() {
  const items = [
    {
      q: "Me asesoraron súper bien y encontré todo para mis recetas. ¡Llegó rapidísimo!",
      a: "Natalia",
    },
    { q: "Gran variedad y precios claros. Volveré a comprar.", a: "Rodrigo" },
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
                <span className="ml-2 text-emerald-600">★★★★★</span>
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
  const offers = await fetchOffersProducts();

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
                    price={p.price}
                    originalPrice={p.originalPrice}
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
