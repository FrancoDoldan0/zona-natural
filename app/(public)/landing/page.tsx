export const revalidate = 300; // cache incremental (5 minutos)

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import HeroSlider, { type BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import BestSellersGrid from "@/components/landing/BestSellersGrid";
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
      cache: "force-cache",
      next: { revalidate: 300 },
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

// Tipo compatible con ProductCard / BestSellersGrid
type ProductForGrid = {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  cover?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  status?: string | null;
  appliedOffer?: any | null;
  offer?: any | null;
};

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
 * Catálogo liviano para "Más vendidos".
 * Usa el endpoint general /api/public/catalogo, que ya resuelve imágenes y precios.
 */
async function getCatalogForGrid(perPage = 200): Promise<ProductForGrid[]> {
  const url = await abs(
    `/api/public/catalogo?status=active&perPage=${perPage}&sort=-id`
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

    const priceFinal =
      typeof p.priceFinal === "number" ? p.priceFinal : null;
    const priceOriginal =
      typeof p.priceOriginal === "number" ? p.priceOriginal : null;

    return {
      id: Number(p.id),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      cover,
      image: cover, // lo que usa ProductCard
      price: priceFinal,
      originalPrice: priceOriginal,
      status: p.status ?? null,
      appliedOffer: p.offer ?? p.appliedOffer ?? null,
      offer: p.offer ?? null,
    } satisfies ProductForGrid;
  });
}

/**
 * Ofertas para la landing:
 * 1) Usa getAllOffersRaw() para obtener la lista "oficial" de productos en oferta.
 * 2) Pide esos productos a /api/public/catalogo pasando sus IDs,
 *    para reutilizar la misma lógica de imágenes/precios que /ofertas y /tienda.
 */
async function getOffersForLanding(
  offersAllRaw: LandingOffer[]
): Promise<ProductForGrid[]> {
  const offerIds = (offersAllRaw || [])
    .map((o) => o.id)
    .filter((id): id is number => typeof id === "number");

  if (!offerIds.length) return [];

  const idsParam = offerIds.join(",");
  const url = await abs(
    `/api/public/catalogo?status=all&perPage=${offerIds.length}&ids=${idsParam}`
  );
  const data = await safeJson<any>(url);

  const items: any[] = (data as any)?.items ?? [];

  if (!Array.isArray(items) || !items.length) return [];

  return items.map((p: any) => {
    const cover: string | null =
      typeof p.cover === "string"
        ? p.cover
        : typeof p.imageUrl === "string"
        ? p.imageUrl
        : null;

    const priceFinal =
      typeof p.priceFinal === "number" ? p.priceFinal : null;
    const priceOriginal =
      typeof p.priceOriginal === "number" ? p.priceOriginal : null;

    const offerData = (offersAllRaw || []).find(
      (o) => o.id === p.id
    ) as LandingOffer | undefined;

    return {
      id: Number(p.id),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      cover,
      image: cover,
      price: priceFinal,
      originalPrice:
        priceOriginal ??
        (typeof offerData?.priceOriginal === "number"
          ? offerData.priceOriginal
          : null),
      status: p.status ?? null,
      appliedOffer: offerData?.offer ?? null,
      offer: offerData?.offer ?? null,
    } satisfies ProductForGrid;
  });
}

/* ───────── página ───────── */
export default async function LandingPage() {
  const seed = new Date().toISOString().slice(0, 10);

  const [banners, cats, catalog, offersAllRaw] = await Promise.all([
    getBanners(),
    getCategories(),
    getCatalogForGrid(200),
    getAllOffersRaw(),
  ]);

  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  const offersPool = await getOffersForLanding(offersAllRaw || []);

  const offersDaily = shuffleSeed(
    offersPool,
    `${seed}:offers`
  ).slice(0, OFFERS_COUNT);

  // ───────── Lógica de sucursales ─────────
  const hours: [string, string][] = [
    ["Lun–Vie", "09:00–19:00"],
    ["Sábado", "09:00–13:00"],
    ["Domingo", "Cerrado"],
  ];
  const encode = (s: string) => encodeURIComponent(s);

  const branches: Branch[] = [
    {
      name: "Las Piedras",
      address:
        "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode(
          "Av. José Gervasio Artigas 600, Las Piedras, Canelones"
        ),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode(
          "Av. José Gervasio Artigas 600, Las Piedras, Canelones"
        ) +
        "&output=embed",
      hours,
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
      hours,
    },
    {
      name: "La Paz",
      address:
        "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode(
          "César Mayo Gutiérrez, 15900 La Paz, Canelones"
        ),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode(
          "César Mayo Gutiérrez, 15900 La Paz, Canelones"
        ) +
        "&output=embed",
      hours,
    },
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode(
          "Av. José Artigas, 15900 Progreso, Canelones"
        ) +
        "&output=embed",
      hours,
    },
  ];

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

      {/* Ofertas (rotación diaria) — mismas que /ofertas */}
      <OffersCarousel
        items={offersDaily as any}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano) */}
      <BestSellersGrid items={catalog as any} />

      {/* Recetas populares (lazy) */}
      <RecipesPopularLazy />

      {/* Testimonios + badges (lazy) */}
      <TestimonialsBadgesLazy />

      {/* Mapa + horarios con múltiples sucursales (lazy) */}
      <MapHoursLazy
        locations={branches.filter(
          (b) => b.name === "Las Piedras" || b.name === "La Paz"
        )}
      />

      {/* Sello sustentable */}
      <Sustainability />

      {/* WhatsApp flotante (lazy) */}
      <WhatsAppFloatLazy />
    </>
  );
}
