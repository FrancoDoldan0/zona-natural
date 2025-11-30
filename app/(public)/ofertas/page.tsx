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

/* ================= tipos ================= */

type RawProduct = {
  id: number;
  name: string;
  slug: string;

  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;

  image?: any;
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: string | null;
  images?: { url: string; alt?: string | null }[];

  brand?: string | null;
  subtitle?: string | null;
  variants?: any[];

  appliedOffer?: any | null;
  offer?: any | null;
};

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

/* elegir imagen igual que en otros sidebars */
function firstImage(p: RawProduct) {
  return (
    p.cover ??
    p.coverUrl ??
    p.image ??
    p.imageUrl ??
    (Array.isArray(p.images) && p.images.length ? p.images[0] : null)
  );
}

/* ================= lógica de ofertas ================= */

/**
 * Devuelve null si el producto NO es oferta.
 * Si es oferta, calcula price / originalPrice y arma la card.
 *
 * Cuenta como oferta si:
 *  - tiene priceFinal < priceOriginal, o
 *  - tiene appliedOffer / offer
 */
function buildOfferCardFromProduct(p: RawProduct): OfferCardData | null {
  const fin = Number(p.priceFinal ?? p.price ?? NaN);
  const origField = Number(p.priceOriginal ?? NaN);
  const rawOffer = (p.appliedOffer || p.offer) as
    | { discountType?: "AMOUNT" | "PERCENT"; discountVal?: number | null }
    | null
    | undefined;

  const hasNumeric =
    !Number.isNaN(fin) && !Number.isNaN(origField) && fin < origField;
  const hasFlag = !!rawOffer;

  if (!hasNumeric && !hasFlag) {
    // no pinta como oferta
    return null;
  }

  let price: number | undefined =
    !Number.isNaN(fin) && fin >= 0 ? fin : undefined;
  let originalPrice: number | undefined =
    !Number.isNaN(origField) && origField > 0 ? origField : undefined;

  // Si viene sólo la offer (discountVal) pero no priceOriginal,
  // intentamos reconstruir el precio original.
  if (!originalPrice && price != null && rawOffer?.discountVal) {
    const val = Number(rawOffer.discountVal);
    if (!Number.isNaN(val) && val > 0) {
      if (rawOffer.discountType === "PERCENT") {
        const base = price / (1 - val / 100);
        originalPrice = Math.round(base);
      } else {
        // AMOUNT u otro: sumamos monto
        originalPrice = price + val;
      }
    }
  }

  // si ni siquiera tenemos price, no sirve
  if (price == null) return null;

  return {
    id: p.id,
    slug: p.slug,
    title: p.name,
    image: firstImage(p),
    price,
    originalPrice,
    brand: p.brand ?? undefined,
    subtitle: p.subtitle ?? undefined,
    variants: p.variants,
  };
}

async function fetchOffersProducts(): Promise<OfferCardData[]> {
  // Traemos un catálogo grande y filtramos ofertas.
  // Usamos status=all para no depender de filtros del backend.
  const url = await abs(
    "/api/public/catalogo?perPage=600&status=all&sort=-id",
  );
  const json = await safeJson<any>(url);

  const list: RawProduct[] =
    (json?.items as RawProduct[]) ??
    (json?.data as RawProduct[]) ??
    (Array.isArray(json) ? (json as RawProduct[]) : []);

  if (!Array.isArray(list) || !list.length) return [];

  const cards: OfferCardData[] = [];

  for (const p of list) {
    const card = buildOfferCardFromProduct(p);
    if (card) cards.push(card);
  }

  // Ordenar por % de descuento (mayor primero)
  cards.sort((a, b) => {
    const da =
      a.originalPrice && a.price && a.price < a.originalPrice
        ? 1 - a.price / a.originalPrice
        : 0;
    const db =
      b.originalPrice && b.price && b.price < b.originalPrice
        ? 1 - b.price / b.originalPrice
        : 0;
    return db - da;
  });

  return cards;
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
                    brand={p.brand}
                    subtitle={p.subtitle}
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
