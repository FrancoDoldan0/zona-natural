// app/(public)/landing/page.tsx
export const revalidate = 60; // cache incremental

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
// ... (otros imports de componentes)
import { headers } from "next/headers";
import { getAllOffersRaw, type LandingOffer } from "@/lib/offers-landing";
// IMPORTANTE: Cambiamos el alias para usar el nuevo lib/catalog-landing.ts
import { getLandingCatalog, type ProductLiteRow } from "@/lib/catalog-landing"; 

/** Cantidad de ofertas que usamos en el carrusel de la landing */
const OFFERS_COUNT = 24;

/* ───────── helpers comunes (abs, safeJson, hash, seededRand, shuffleSeed) ───────── */
// ... (MANTENER TODOS TUS HELPERS TAL CUAL ESTÁN: abs, safeJson, hash, seededRand, shuffleSeed)
// Ya que son funcionales y necesarios.
// ...

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

/* ───────── data fetchers (getBanners, getCategories) ───────── */
// ... (MANTENER getBanners y getCategories TAL CUAL ESTÁN)
// ...

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
  
  // ... (MANTENER LÓGICA DE hours, encode, y branches TAL CUAL ESTÁN)
  
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
      {/* ... (resto de componentes) */}
    </>
  );
}