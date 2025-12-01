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
import { getLandingCatalog } from "@/lib/catalog-landing";

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

type Prod = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: any;
  image?: any;
  status?: string;
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── data fetchers ───────── */
async function getBanners(): Promise<BannerItem[]> {
  const data = await safeJson<any>(await abs("/api/public/banners"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return (list as any[])
    .map((b, i) => ({
      id: Number(b.id ?? i),
      title: String(b.title ?? b.name ?? ""),
      image:
        b.image ?? b.imageUrl
          ? (b.image ?? b.imageUrl)
          : ({ url: b.url ?? "" } as any),
      linkUrl: b.linkUrl ?? b.href ?? null,
    }))
    .filter(
      (x) =>
        !!(typeof x.image === "string" || (x.image as any)?.url)
    );
}

async function getCategories(): Promise<Cat[]> {
  const data = await safeJson<any>(await abs("/api/public/categories"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

/* ───────── página ───────── */
export default async function LandingPage() {
  const [banners, cats, offersAllRaw, catalogRaw] = await Promise.all([
    getBanners(),
    getCategories(),
    getAllOffersRaw(),       // helper liviano de ofertas
    getLandingCatalog(48),   // helper liviano de catálogo
  ]);

  // Cast suave para reutilizar el tipo Prod en el carrusel
  const offersAll = offersAllRaw as unknown as Prod[];

  // Adaptamos el catálogo ligero al tipo Prod que espera BestSellersGrid
  const catalog = (catalogRaw as any[]).map((p) => {
    const price =
      typeof p.price === "number" ? p.price : null;
    const imgUrl = (p as any).imageUrl ?? null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price,
      priceOriginal: price,
      priceFinal: price,
      imageUrl: imgUrl,
      image: imgUrl ? { url: imgUrl } : undefined,
      cover: imgUrl,
      coverUrl: imgUrl,
      status: (p as any).status ?? undefined,
      appliedOffer: null,
      offer: null,
    } satisfies Prod;
  });

  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);

  // Rotación diaria de categorías
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // Rotación diaria de ofertas (pool completo → mostramos OFFERS_COUNT)
  const offersDaily = shuffleSeed(
    offersAll,
    `${seed}:offers`
  ).slice(0, OFFERS_COUNT);

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
        items={offersDaily}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano) */}
      <BestSellersGrid items={catalog} />

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
