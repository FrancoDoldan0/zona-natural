// app/(public)/landing/page.tsx 
export const revalidate = 60; // cache incremental

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
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
import { headers } from "next/headers";
import { getAllOffersRaw } from "@/lib/offers-landing";

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── helpers comunes ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;

  // Si está seteada la base pública, la usamos.
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  // En SSR/hidratación puede que no haya Request context; evitamos tirar error.
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {
    // sin headers(): devolvemos ruta relativa (Next la resuelve en runtime)
  }

  return path;
}

async function safeJson<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
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

/* ───────── helpers de shuffle con seed diaria ───────── */
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

// Este tipo está pensado para ser compatible con ProductCard / BestSellersGrid
type ProductForGrid = {
  id: number;
  name: string;
  slug: string;
  // BestSellersGrid espera image como string | null | undefined
  image?: string | null;
  cover?: string | null;
  // precios ya calculados por la API pública
  price?: number | null; // usamos priceFinal
  originalPrice?: number | null; // usamos priceOriginal
  status?: string | null;
  // campos extra opcionales que ProductCard ignora si no existen
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── helpers específicos de ofertas ───────── */

// Devuelve la primera URL de imagen válida que encuentre en la oferta
function getOfferImageUrl(p: any): string | null {
  const take = (v: any): string | null =>
    typeof v === "string" && v.trim().length ? v : null;

  const candidates: any[] = [
    p.cover,
    p.image,
    p.imageUrl,
    p.product?.cover,
    p.product?.image,
    p.product?.imageUrl,
    p.product?.image?.url,
    p.variant?.cover,
    p.variant?.image,
    p.variant?.imageUrl,
    p.variant?.image?.url,
  ];

  for (const c of candidates) {
    const val = take(c);
    if (val) return val;
  }

  // arrays de imágenes
  if (Array.isArray(p.images) && p.images[0]?.url) {
    const val = take(p.images[0].url);
    if (val) return val;
  }
  if (Array.isArray(p.product?.images) && p.product.images[0]?.url) {
    const val = take(p.product.images[0].url);
    if (val) return val;
  }
  if (Array.isArray(p.variant?.images) && p.variant.images[0]?.url) {
    const val = take(p.variant.images[0].url);
    if (val) return val;
  }

  return null;
}

/* ───────── data fetchers ───────── */
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

// Catálogo liviano para "Más vendidos"
async function getCatalogForGrid(perPage = 96): Promise<ProductForGrid[]> {
  const data = await safeJson<any>(
    await abs(
      `/api/public/catalogo?status=all&perPage=${perPage}&sort=-id`
    )
  );

  const items: any[] =
    (data as any)?.items ??
    (data as any)?.data ??
    (data as any)?.products ??
    (data as any)?.results ??
    [];

  if (!Array.isArray(items) || !items.length) return [];

  return items.map((p: any) => {
    // La API ya nos da cover con URL pública (R2)
    const cover: string | null =
      typeof p.cover === "string" ? p.cover : null;

    // priceFinal / priceOriginal ya vienen calculados en /api/public/catalogo
    const priceFinal =
      typeof p.priceFinal === "number" ? p.priceFinal : null;
    const priceOriginal =
      typeof p.priceOriginal === "number" ? p.priceOriginal : null;

    return {
      id: Number(p.id),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      cover,
      image: cover, // 👈 lo que usa ProductCard
      price: priceFinal,
      originalPrice: priceOriginal,
      status: p.status ?? null,
      appliedOffer: p.appliedOffer ?? null,
      offer: p.offer ?? null,
    } satisfies ProductForGrid;
  });
}

/* ───────── página ───────── */
export default async function LandingPage() {
  const [banners, cats, offersAllRaw, catalog] = await Promise.all([
    getBanners(),
    getCategories(),
    getAllOffersRaw(), // pool completo de ofertas normalizadas (con cover y precios)
    getCatalogForGrid(96),
  ]);

  // Normalizamos las ofertas para asegurarnos de que SIEMPRE tengan:
  // cover (string), image (string) e imageUrl (string)
  const offersAll = (offersAllRaw || []).map((p: any) => {
    const primary = getOfferImageUrl(p);

    return {
      ...p,
      cover: primary ?? (typeof p.cover === "string" ? p.cover : null),
      imageUrl:
        primary ?? (typeof p.imageUrl === "string" ? p.imageUrl : null),
      image: primary ?? p.image ?? null,
    };
  });

  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);

  // Rotación diaria de categorías
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // Rotación diaria de ofertas (pool completo → mostramos OFFERS_COUNT)
  const offersDailyRaw = shuffleSeed(
    offersAll,
    `${seed}:offers`
  ).slice(0, OFFERS_COUNT);

  // Mapa rápido de catálogo por id (para reaprovechar imagen/precios que ya funcionan)
  const catalogById = new Map<number, ProductForGrid>();
  for (const item of catalog) {
    catalogById.set(item.id, item);
  }

  // Adaptamos las ofertas al formato que espera ProductCard,
  // usando imagen/precios del catálogo cuando estén disponibles.
  const offersDailyForCarousel: ProductForGrid[] = offersDailyRaw.map(
    (p: any) => {
      const fromCatalog = catalogById.get(Number(p.id));

      const image =
        (fromCatalog?.image as string | null | undefined) ??
        getOfferImageUrl(p);

      const priceFinal =
        typeof p.priceFinal === "number"
          ? p.priceFinal
          : typeof p.price === "number"
          ? p.price
          : fromCatalog?.price ??
            null;

      const priceOriginal =
        typeof p.priceOriginal === "number"
          ? p.priceOriginal
          : typeof p.originalPrice === "number"
          ? p.originalPrice
          : fromCatalog?.originalPrice ??
            null;

      return {
        id: Number(p.id),
        name: String(p.name ?? fromCatalog?.name ?? ""),
        slug: String(p.slug ?? fromCatalog?.slug ?? ""),
        cover: image ?? fromCatalog?.cover ?? null,
        image: image ?? fromCatalog?.image ?? null,
        price: priceFinal,
        originalPrice: priceOriginal,
        status: p.status ?? fromCatalog?.status ?? null,
        appliedOffer: p.appliedOffer ?? fromCatalog?.appliedOffer ?? null,
        offer: p.offer ?? fromCatalog?.offer ?? null,
      };
    }
  );

  // ───────── Sucursales (tabs) ─────────
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
    <main className="bg-black text-[#00a650] min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        /* Forzamos el color verde en botones y links de componentes externos */
        button, a { color: #00a650 !important; }
        .bg-primary, button[type="submit"], .btn-primary { 
          background-color: #00a650 !important; 
          color: black !important; 
        }
        h1, h2, h3, h4, span, p { color: #00a650; }
      `}} />
      
      <InfoBar />
      <Header />
      <MainNav />

      {/* HERO full-bleed */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
        <HeroSlider items={banners} />
      </div>

      <div className="py-12 space-y-24">
        {/* Categorías con rotación diaria */}
        <CategoriesRow cats={catsDaily} />

        {/* Ofertas (rotación diaria) */}
        <OffersCarousel
          items={offersDailyForCarousel as any}
          visible={3}
          rotationMs={6000}
        />

        {/* Más vendidos (catálogo liviano, con imágenes y precios) */}
        <BestSellersGrid items={catalog as any} />

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
      </div>

      <WhatsAppFloat />
    </main>
  );
}