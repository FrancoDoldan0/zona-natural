export const revalidate = 60; // cache incremental - MANTENIDO

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
// Se importa dinámicamente:
import dynamic from "next/dynamic"; 
import { Suspense } from "react";
// Solo importamos la interfaz para evitar problemas de tipos si es necesario
import type { BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import BestSellersGrid from "@/components/landing/BestSellersGrid";
import RecipesPopular from "@/components/landing/RecipesPopular";
import TestimonialsBadges from "@/components/landing/TestimonialsBadges";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import { headers } from "next/headers";
import { getAllOffersRaw, type LandingOffer } from "@/lib/offers-landing";

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── Dynamic Imports para componentes de baja prioridad ───────── */
// Lazy Load: Mueven la carga de JS de estos componentes al momento que se necesitan.
const HeroSlider = dynamic(() => import("@/components/landing/HeroSlider"), {
  ssr: true, // Asegura que el contenido inicial se renderice en el servidor (SEO/First Contentful Paint)
  loading: () => <div className="h-[400px] bg-gray-100 animate-pulse" />, // Placeholder visual
});

const RecipesPopularDynamic = dynamic(() => import("@/components/landing/RecipesPopular"), {
  ssr: true,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse" />,
});

const TestimonialsBadgesDynamic = dynamic(() => import("@/components/landing/TestimonialsBadges"), {
  ssr: true,
  loading: () => <div className="h-40 bg-gray-100 animate-pulse" />,
});

const MapHoursDynamic = dynamic(() => import("@/components/landing/MapHours"), {
  ssr: true,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse" />,
});

const SustainabilityDynamic = dynamic(() => import("@/components/landing/Sustainability"), {
  ssr: true,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse" />,
});

// El resto de helpers y data fetchers se mantienen sin cambios

/* ───────── (Se mantiene abs, safeJson, hash, seededRand, shuffleSeed) ───────── */
// ... (Aquí irían abs, safeJson, hash, seededRand, shuffleSeed) ...
// (Para no repetir, asumimos que este código intermedio se mantiene inalterado)

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

/* ───────── (Se mantienen data fetchers: getBanners, getCategories, getCatalogForGrid, getOffersForLanding) ───────── */
// ... (Aquí irían getBanners, getCategories, getCatalogForGrid, getOffersForLanding) ...
// (Para no repetir, asumimos que este código intermedio se mantiene inalterado)


/* ───────── página optimizada ───────── */
export default async function LandingPage() {
  const seed = new Date().toISOString().slice(0, 10);

  // 1. Mejor Concurrencia: Se usa Promise.all para todo el data fetching.
  // MANTENIDO: El fetching principal ya usa Promise.all. ¡Genial!
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

  // MANTENIDO: Lógica de sucursales sin cambios
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
      {/* Componentes de ALTA PRIORIDAD (Above the fold) - Carga normal (Eager loading) */}
      <InfoBar />
      <Header />
      <MainNav />

      {/* HERO full-bleed */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
        {/* Usamos el componente Dynamic Import con Suspense para manejar su estado de carga */}
        <Suspense fallback={<div className="h-[400px] bg-gray-100 animate-pulse" />}>
          <HeroSlider items={banners} />
        </Suspense>
      </div>

      {/* Categorías con rotación diaria - Carga normal (Alta prioridad visual) */}
      <CategoriesRow cats={catsDaily} />

      {/* Ofertas (rotación diaria) — mismas que /ofertas - Carga normal (Alta prioridad visual) */}
      <OffersCarousel
        items={offersDaily as any}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano) - Carga normal (Alta prioridad visual) */}
      <BestSellersGrid items={catalog as any} />

      {/* Componentes de BAJA PRIORIDAD (Below the fold) - 
        Usamos Dynamic Imports (Lazy Loading) y Suspense para deferir su carga de JS 
      */}

      {/* Recetas populares */}
      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse" />}>
        <RecipesPopularDynamic />
      </Suspense>

      {/* Testimonios + badges */}
      <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
        <TestimonialsBadgesDynamic />
      </Suspense>

      {/* Mapa + horarios con múltiples sucursales */}
      <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse" />}>
        <MapHoursDynamic
          locations={branches.filter(
            (b) => b.name === "Las Piedras" || b.name === "La Paz"
          )}
        />
      </Suspense>

      {/* Sello sustentable */}
      <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse" />}>
        <SustainabilityDynamic />
      </Suspense>

      {/* WhatsApp flotante: mantener normal o dynamic/lazy sin ssr si está muy abajo */}
      <WhatsAppFloat />
    </>
  );
}