// app/(public)/landing/page.tsx
export const revalidate = 60; // cache incremental

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";

// IMPORTS DE COMPONENTES
import MainNav from "@/components/landing/MainNav";
import HeroSlider, { type BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import BestSellersGrid from "@/components/landing/BestSellersGrid";
import RecipesPopular from "@/components/landing/RecipesPopular";
import TestimonialsBadges from "@/components/landing/TestimonialsBadges";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";

import { getAllOffersRaw, type LandingOffer } from "@/lib/offers-landing";
import { type LandingProduct } from "@/lib/catalog-helpers";

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── helpers comunes (abs, safeJson, hash, seededRand, shuffleSeed) ───────── */

/**
 * Construye una URL absoluta usando la base pública si está definida.
 * Versión SINCRÓNICA (no usa `headers()`, así la página puede ser estática con ISR).
 */
function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

async function safeJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const url = abs(path);
    const res = await fetch(url, {
      next: { revalidate: 60 }, // deja que Next cachee por defecto
      ...init,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seededRand(seed: string) {
  let x = hash(seed) || 1;
  return () =>
    (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
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

/* ───────── NUEVO: DATA FETCHER PARA LA LANDING (usa la nueva API) ───────── */

type LandingApiResponse = {
  status: string;
  products: LandingProduct[];
};

/**
 * Función que consume la API dedicada para la landing,
 * la cual garantiza el fallback de imagen y el cálculo de precios.
 */
async function getLandingData(
  ids?: number[],
  perPage: number = 60
): Promise<LandingProduct[]> {
  const query =
    ids && ids.length > 0
      ? `ids=${ids.join(",")}`
      : `perPage=${perPage}`;

  const data = await safeJson<LandingApiResponse>(
    `/api/public/landing-catalog?${query}`
  );

  if (!data || data.status !== "success" || !Array.isArray(data.products)) {
    console.error("[Landing] Error al obtener datos de la API de landing.");
    return [];
  }

  return data.products;
}

/* ───────── data fetchers (getBanners, getCategories) ───────── */

async function getBanners(): Promise<BannerItem[]> {
  const data = await safeJson<any>("/api/public/banners");
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
  const data = await safeJson<any>("/api/public/categories");
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

/**
 * Catálogo liviano para "Más vendidos".
 * Usa la API de landing para obtener solo los campos necesarios.
 */
async function getCatalogForGrid(perPage = 60): Promise<ProductForGrid[]> {
  const items = await getLandingData(undefined, perPage);

  return items.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    cover: p.imageUrl,
    image: p.imageUrl,
    price: p.priceFinal, // price final ya resuelto por la API
    originalPrice: undefined, // en este modo no exponemos el original
    status: p.status,
  })) as ProductForGrid[];
}

/* ───────── página ───────── */

export default async function LandingPage() {
  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);

  const [banners, cats, catalogRaw, offersAllRaw] = await Promise.all([
    getBanners(),
    getCategories(),
    getCatalogForGrid(60), // Más vendidos: no necesitamos 200 productos
    getAllOffersRaw(),
  ]);

  // Rotación diaria de categorías
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // ───────── Ofertas unificadas ─────────

  const offerIds = (offersAllRaw || [])
    .map((o: LandingOffer) => o.id)
    .filter((id): id is number => typeof id === "number");

  let offersPool: ProductForGrid[] = [];

  if (offerIds.length > 0) {
    // Obtiene desde la API de landing solo los productos en oferta
    const rawOffers = await getLandingData(offerIds);

    offersPool = rawOffers.map((p) => {
      // Data original de la oferta (contiene metadatos de precios/aplicación)
      const offerData = (offersAllRaw || []).find(
        (o: LandingOffer) => o.id === p.id
      );

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        cover: p.imageUrl,
        image: p.imageUrl,
        price: p.priceFinal,
        originalPrice: offerData?.priceOriginal ?? null,
        status: p.status ?? null,
        appliedOffer: offerData?.offer ?? null,
        offer: offerData?.offer ?? null,
      } satisfies ProductForGrid;
    });
  }

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
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones") +
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
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones") +
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
        encode("Av. José Artigas, 15900 Progreso, Canelones") +
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

      {/* Ofertas (rotación diaria) */}
      <OffersCarousel
        items={offersDaily as any}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano) */}
      <BestSellersGrid items={catalogRaw as any} />

      {/* Recetas populares */}
      <RecipesPopular />

      {/* Testimonios + badges */}
      <TestimonialsBadges />

      {/* Mapa + horarios con múltiples sucursales */}
      <MapHours
        locations={branches.filter(
          (b) => b.name === "Las Piedras" || b.name === "La Paz"
        )}
      />

      {/* Sello sustentable */}
      <Sustainability />

      <WhatsAppFloat />
    </>
  );
}
