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

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 }, ...init });
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
  const data = await safeJson<any>(await abs("/api/public/banners"), {
    cache: "no-store",
    next: { revalidate: 0 },
  });
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
    .filter((x) => !!(typeof x.image === "string" || (x.image as any)?.url));
}

async function getCategories(): Promise<Cat[]> {
  const data = await safeJson<any>(await abs("/api/public/categories"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

async function getOffersRaw(): Promise<Prod[]> {
  const data = await safeJson<any>(
    await abs("/api/public/catalogo?perPage=48&sort=-id"),
    { cache: "no-store", next: { revalidate: 0 } }
  );
  const items: Prod[] = ((data as any)?.items ?? []) as Prod[];
  return items.filter((p) => {
    const priced =
      p.priceFinal != null &&
      p.priceOriginal != null &&
      Number(p.priceFinal) < Number(p.priceOriginal);
    const flagged = !!(p.appliedOffer || p.offer);
    return priced || flagged;
  });
}

async function getCatalog(perPage = 48): Promise<Prod[]> {
  const statuses = ["all", "raw"];
  for (const status of statuses) {
    const data = await safeJson<any>(
      await abs(
        `/api/public/catalogo?status=${status}&perPage=${perPage}&sort=-id&_ts=${Date.now()}`
      ),
      { cache: "no-store", next: { revalidate: 0 } }
    );
    const items: any[] =
      (data as any)?.items ??
      (data as any)?.data ??
      (data as any)?.products ??
      (data as any)?.results ??
      [];
    if (Array.isArray(items) && items.length) return items as Prod[];
  }
  return [];
}

/* ───────── página ───────── */
export default async function LandingPage() {
  const [banners, cats, offersAll, catalog] = await Promise.all([
    getBanners(),
    getCategories(),
    getOffersRaw(),
    getCatalog(48),
  ]);

  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);

  // Rotación diaria
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // ⬇️ Aumentamos el pool de ofertas para que el carrusel rote
  const OFFERS_COUNT = 24; // antes 3
  const offersDaily = shuffleSeed(offersAll, `${seed}:offers`).slice(
    0,
    OFFERS_COUNT
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
      address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
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
      {/* ⬇️ Mostrar 3 a la vez y rotar sobre OFFERS_COUNT */}
      <OffersCarousel items={offersDaily} visible={3} rotationMs={6000} />

      {/* Más vendidos (simulado por clics + heurística) */}
      <BestSellersGrid items={catalog} />

      {/* Recetas populares */}
      <RecipesPopular />

      {/* Testimonios + badges */}
      <TestimonialsBadges />

      {/* Mapa + horarios con múltiples sucursales */}
      {/* 🔧 Solo Las Piedras y La Paz */}
      <MapHours
        locations={branches.filter(
          (b) => b.name === "Las Piedras" || b.name === "La Paz"
        )}
      />

      {/* Sello sustentable */}
      <Sustainability />

      {/* ⚠️ Footer verde eliminado para evitar el doble pie.
          El footer blanco global permanece. */}
      <WhatsAppFloat />
    </>
  );
}
