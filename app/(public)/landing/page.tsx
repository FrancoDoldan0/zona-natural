// app/(public)/landing/page.tsx
export const revalidate = 60; // cache incremental (igual que antes)

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import HeroSlider, { type BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import BestSellersGrid from "@/components/landing/BestSellersGrid";
// estos 4 ahora se cargarán con dynamic:
import dynamic from "next/dynamic";
import type { Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";
import { headers } from "next/headers";
import { getAllOffersRaw, type LandingOffer } from "@/lib/offers-landing";

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── CARGA DIFERIDA DE BLOQUES PESADOS ───────── */

const RecipesPopularLazy = dynamic(
  () => import("@/components/landing/RecipesPopular"),
  { loading: () => null }
);

const TestimonialsBadgesLazy = dynamic(
  () => import("@/components/landing/TestimonialsBadges"),
  { loading: () => null }
);

const MapHoursLazy = dynamic(
  () => import("@/components/landing/MapHours"),
  { loading: () => null }
);

const WhatsAppFloatLazy = dynamic(
  () => import("@/components/landing/WhatsAppFloat"),
  { loading: () => null }
);

/* ───────── helpers comunes ───────── */

async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {
    // SSR sin headers(): devolvemos ruta relativa
  }
  return path;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 }, // igual que tu versión original
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ───────── helpers de shuffle con seed diaria ───────── */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seededRand(seed: string) {
  let x = hash(seed) || 1;
  return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
function shuffleSeed<T>(arr: T[], seed: string) {
  const rand = seededRand(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────── tipos ───────── */
type Cat = {
  id: number;
  name: string;
  slug: string;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  image?: any;
  cover?: any;
};

// Tipo compatible con ProductCard / BestSellersGrid / OffersCarousel
type ProductForGrid = {
  id: number;
  name: string;
  slug: string;

  // imagenes
  image?: string | null;
  cover?: string | null;
  imageUrl?: string | null;

  // precios
  price?: number | null;
  originalPrice?: number | null;

  // alias más explícitos para el carrusel
  priceFinal?: number | null;
  priceOriginal?: number | null;
  discountPercent?: number | null;

  status?: string | null;
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── sucursales (constantes fuera del render) ───────── */

const HOURS_DEFAULT: [string, string][] = [
  ["Lun–Vie", "09:00–19:00"],
  ["Sábado", "09:00–13:00"],
  ["Domingo", "Cerrado"],
];

const BRANCHES_ALL: Branch[] = (() => {
  const encode = (s: string) => encodeURIComponent(s);

  return [
    {
      name: "Las Piedras",
      address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones") +
        "&output=embed",
      hours: HOURS_DEFAULT,
    },
    {
      name: "Maroñas",
      address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo") +
        "&output=embed",
      hours: HOURS_DEFAULT,
    },
    {
      name: "La Paz",
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones") +
        "&output=embed",
      hours: HOURS_DEFAULT,
    },
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones") +
        "&output=embed",
      hours: HOURS_DEFAULT,
    },
  ];
})();

/* ───────── data fetchers básicos ───────── */

async function getBanners(): Promise<BannerItem[]> {
  const data = await safeJson<any>(await abs("/api/public/banners"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return (list as any[])
    .map((b, i) => {
      const rawImage = b.image ?? b.imageUrl ?? null;
      const image =
        typeof rawImage === "string"
          ? rawImage
          : rawImage && typeof rawImage.url === "string"
          ? rawImage.url
          : b.url ?? null;

      return {
        id: Number(b.id ?? i),
        title: String(b.title ?? b.name ?? ""),
        image,
        linkUrl: b.linkUrl ?? b.href ?? null,
      };
    })
    .filter((x) => !!x.image);
}

async function getCategories(): Promise<Cat[]> {
  const data = await safeJson<any>(await abs("/api/public/categories"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

/**
 * Catálogo base para la landing (se reutiliza para:
 * - "Más vendidos"
 * - "Las mejores ofertas" (via join con getAllOffersRaw)
 *
 * Usa el endpoint general /api/public/catalogo,
 * que ya resuelve imágenes y precios (incluye ofertas).
 */
async function getCatalogForLanding(perPage = 200): Promise<ProductForGrid[]> {
  const url = await abs(
    `/api/public/catalogo?status=all&perPage=${perPage}&sort=-id`
  );
  const data = await safeJson<any>(url);

  const items: any[] =
    (data as any)?.items ??
    (data as any)?.data ??
    (data as any)?.products ??
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(items) || !items.length) return [];

  return items.map((p: any) => {
    const cover: string | null =
      typeof p.cover === "string"
        ? p.cover
        : typeof p.imageUrl === "string"
        ? p.imageUrl
        : null;

    const priceFinalRaw =
      typeof p.priceFinal === "number"
        ? p.priceFinal
        : typeof p.price === "number"
        ? p.price
        : null;

    const priceOriginalRaw =
      typeof p.priceOriginal === "number" ? p.priceOriginal : null;

    const discountPercent =
      priceFinalRaw != null &&
      priceOriginalRaw != null &&
      priceOriginalRaw > 0
        ? Math.round((1 - priceFinalRaw / priceOriginalRaw) * 100)
        : null;

    return {
      id: Number(p.id),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      cover,
      image: cover,
      imageUrl: cover,
      price: priceFinalRaw,
      priceFinal: priceFinalRaw,
      originalPrice: priceOriginalRaw,
      priceOriginal: priceOriginalRaw,
      discountPercent,
      status: p.status ?? null,
      appliedOffer: p.offer ?? p.appliedOffer ?? null,
      offer: p.offer ?? null,
    } satisfies ProductForGrid;
  });
}

/**
 * Une el catálogo general con las ofertas "oficiales" de getAllOffersRaw
 * para generar la lista de items que se muestran en el carrusel de landing.
 *
 * Importante: NO hace otra llamada HTTP.
 */
function buildOffersFromCatalog(
  catalog: ProductForGrid[],
  offersAllRaw: LandingOffer[] | null | undefined
): ProductForGrid[] {
  if (!catalog.length || !offersAllRaw?.length) return [];

  const byId = new Map<number, ProductForGrid>();
  for (const p of catalog) {
    byId.set(Number(p.id), p);
  }

  const result: ProductForGrid[] = [];

  for (const offer of offersAllRaw) {
    const idNum = Number((offer as any).id);
    if (!Number.isFinite(idNum)) continue;

    const base = byId.get(idNum);
    if (!base) continue;

    const offerOriginal =
      typeof (offer as any).priceOriginal === "number"
        ? (offer as any).priceOriginal
        : null;

    const priceFinal =
      base.priceFinal ?? base.price ?? null;

    const baseOriginal =
      base.priceOriginal ?? base.originalPrice ?? null;

    const finalOriginal = baseOriginal ?? offerOriginal ?? null;

    const discountPercent =
      priceFinal != null &&
      finalOriginal != null &&
      finalOriginal > 0
        ? Math.round((1 - priceFinal / finalOriginal) * 100)
        : base.discountPercent ?? null;

    result.push({
      ...base,
      originalPrice: finalOriginal,
      priceOriginal: finalOriginal,
      price: priceFinal,
      priceFinal,
      discountPercent,
      appliedOffer: (offer as any).offer ?? base.appliedOffer ?? null,
      offer: (offer as any).offer ?? base.offer ?? null,
    });
  }

  return result;
}

/* ───────── página ───────── */

export default async function LandingPage() {
  const seed = new Date().toISOString().slice(0, 10);

  // 3 llamadas HTTP en paralelo: banners, categorías, catálogo
  const [banners, cats, catalogAll, offersAllRaw] = await Promise.all([
    getBanners(),
    getCategories(),
    getCatalogForLanding(200),
    getAllOffersRaw(),
  ]);

  // categorías con rotación diaria (máx 8)
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // catálogo para "Más vendidos" (filtramos activos por si acaso)
  const bestSellersItems = catalogAll.filter((p) => {
    const status = (p.status ?? "").toString().toUpperCase();
    return !status || status === "ACTIVE";
  });

  // ofertas construidas a partir del catálogo + getAllOffersRaw (sin nueva llamada HTTP)
  const offersPool = buildOffersFromCatalog(
    catalogAll,
    offersAllRaw ?? []
  );

  const offersDaily = shuffleSeed(
    offersPool,
    `${seed}:offers`
  ).slice(0, OFFERS_COUNT);

  const branches: Branch[] = BRANCHES_ALL.filter(
    (b) => b.name === "Las Piedras" || b.name === "La Paz"
  );

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      {/* HERO full-bleed */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
        <HeroSlider items={banners} />
      </div>

      {/* Categorías con rotación diaria */}
      <CategoriesRow cats={catsDaily} />

      {/* Ofertas (rotación diaria) — mismas que /ofertas, pero sin fetch extra */}
      <OffersCarousel
        items={offersDaily as any}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano reutilizando la misma data) */}
      <BestSellersGrid items={bestSellersItems as any} />

      {/* Recetas populares (lazy) */}
      <RecipesPopularLazy />

      {/* Testimonios + badges (lazy) */}
      <TestimonialsBadgesLazy />

      {/* Mapa + horarios con múltiples sucursales (lazy) */}
      <MapHoursLazy locations={branches} />

      {/* Sello sustentable */}
      <Sustainability />

      {/* WhatsApp flotante (lazy) */}
      <WhatsAppFloatLazy />
    </>
  );
}
