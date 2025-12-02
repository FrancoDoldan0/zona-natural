// app/(public)/landing/page.tsx
export const revalidate = 60; // cache incremental

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";

// 💡 IMPORTS DE COMPONENTES RESTAURADOS (CAUSA DEL ERROR DE COMPILACIÓN)
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
// FIN IMPORTS DE COMPONENTES RESTAURADOS

import { headers } from "next/headers";
import { getAllOffersRaw, type LandingOffer } from "@/lib/offers-landing";
// IMPORTANTE: Cambiamos el alias para usar el nuevo lib/catalog-landing.ts
import { getLandingCatalog, type ProductLiteRow } from "@/lib/catalog-landing"; 

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── helpers comunes ───────── */

// 💡 RESTAURACIÓN DE HELPERS (DEBEN ESTAR DEFINIDOS)

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

// 💡 FIN RESTAURACIÓN DE HELPERS

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
  // precios ya calculados
  price?: number | null; // usamos priceFinal
  originalPrice?: number | null; // usamos priceOriginal
  status?: string | null;
  // campos extra opcionales que ProductCard ignora si no existen
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── data fetchers (getBanners, getCategories) ───────── */

// 💡 RESTAURACIÓN DE getBanners y getCategories

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

// 💡 FIN RESTAURACIÓN getBanners y getCategories

// =========================================================================
// CAMBIO CLAVE: Reemplazamos getCatalogForGrid (que llamaba a /api/public/catalogo)
// por la función getLandingCatalog (que llama a Prisma directamente)
// El catálogo de ofertas lo obtendremos de forma eficiente en el flujo principal.
// =========================================================================
async function getCatalogForGrid(perPage = 200): Promise<ProductForGrid[]> {
    // Usamos la función optimizada para el catálogo general (ej. Más Vendidos)
    const items = await getLandingCatalog(perPage); 

    // Dado que getLandingCatalog devuelve ProductLiteRow, debemos mapear 
    // a ProductForGrid para que las secciones como BestSellersGrid funcionen.
    return items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        cover: p.imageUrl,
        image: p.imageUrl, // 👈 lo que usa ProductCard
        price: p.price,
        // En el catálogo ligero el precio es solo el base, pero el BestSellersGrid lo acepta
        originalPrice: undefined, 
        status: p.status,
    })) as ProductForGrid[];
}

/* ───────── página ───────── */
export default async function LandingPage() {
    
  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);
  
  // PASO 1: Ejecutar las consultas INICIALES en paralelo
  const [banners, cats, catalogRaw, offersAllRaw] = await Promise.all([
    getBanners(),
    getCategories(),
    // Mantenemos esta llamada para la sección "Más vendidos" (BestSellersGrid)
    getCatalogForGrid(200), 
    getAllOffersRaw(), // Fuente de verdad de las ofertas
  ]);

  // Rotación diaria de categorías
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);
  
  // ───────── Ofertas unificadas con la lógica de /ofertas ─────────
  
  // 1) Set de IDs de productos que están en oferta según la lógica "core"
  // Aquí usamos la data de offersAllRaw
  const offerIds = (offersAllRaw || [])
      .map((o: LandingOffer) => o.id)
      .filter((id): id is number => typeof id === "number");

  let offersPool: ProductForGrid[] = [];
  
  // PASO 2: Consulta eficiente SÓLO para los productos en oferta
  // Este bloque reemplaza el filtro manual ineficiente
  if (offerIds.length > 0) {
      // Usamos getLandingCatalog (Prisma directo) con la lista de IDs.
      // ESTO ES CLAVE: Carga solo las ofertas, no 2000+ productos.
      const rawOffers = await getLandingCatalog(0, offerIds);
      
      // Mapeamos los datos de ofertas con los precios correctos (priceFinal/priceOriginal)
      // que vienen en offersAllRaw.
      offersPool = rawOffers.map(p => {
          // Buscamos el objeto de oferta para obtener los precios calculados
          const offerData = offersAllRaw.find(o => o.id === p.id);
          
          return {
              id: p.id,
              name: p.name,
              slug: p.slug,
              cover: p.imageUrl,
              image: p.imageUrl, // URL de R2 del catálogo
              // Usamos los precios calculados por getAllOffersRaw
              price: offerData?.priceFinal ?? p.price,
              originalPrice: offerData?.priceOriginal ?? p.price,
              status: p.status,
              appliedOffer: offerData?.offer,
              offer: offerData?.offer,
          } satisfies ProductForGrid;
      });
  }

  // 4) Rotación diaria de ofertas (pool completo → mostramos OFFERS_COUNT)
  const offersDaily = shuffleSeed(
    offersPool,
    `${seed}:offers`
  ).slice(0, OFFERS_COUNT);

  // ───────── Resto de la página (branches, etc.) ─────────
  
// 💡 RESTAURACIÓN DE LA LÓGICA DE SUCURSALES (NECESARIA PARA MapHours)

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
  
// 💡 FIN RESTAURACIÓN DE LA LÓGICA DE SUCURSALES

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

      {/* Ofertas (rotación diaria) — AHORA SÍ CON TODAS LAS OFERTAS */}
      <OffersCarousel
        items={offersDaily as any}
        visible={3}
        rotationMs={6000}
      />

      {/* Más vendidos (catálogo liviano, usa catalogRaw) */}
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