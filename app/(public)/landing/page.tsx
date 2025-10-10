// app/(public)/landing/page.tsx
export const runtime = "edge";
export const revalidate = 60;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import HeroSlider, { type BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import { headers } from "next/headers";

/** ───────── helpers comunes ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
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

/** ───────── helpers de shuffle con seed diaria ───────── */
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

/** ───────── tipos ───────── */
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
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  appliedOffer?: any | null;
  offer?: any | null;
};

/** ───────── data fetchers ───────── */
async function getBanners(): Promise<BannerItem[]> {
  const data = await safeJson<any>(await abs("/api/public/banners"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return (list as any[])
    .map((b, i) => ({
      id: Number(b.id ?? i),
      title: String(b.title ?? b.name ?? ""),
      image: b.image ?? b.imageUrl ? (b.image ?? b.imageUrl) : { url: b.url ?? "" },
      linkUrl: b.linkUrl ?? b.href ?? null,
    }))
    .filter((x) => !!(x.image?.url || x.image));
}

async function getCategories(): Promise<Cat[]> {
  const data = await safeJson<any>(await abs("/api/public/categories"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

async function getOffersRaw(): Promise<Prod[]> {
  const data = await safeJson<any>(await abs("/api/public/catalogo?perPage=24&sort=-id"));
  const items: Prod[] = (data?.items ?? []) as Prod[];
  // Devolvemos TODO el conjunto de ofertas (sin cortar),
  // así luego aplicamos el shuffle con seed y cortamos en la UI.
  return items.filter((p) => {
    const priced =
      p.priceFinal != null &&
      p.priceOriginal != null &&
      p.priceFinal < p.priceOriginal;
    const flagged = !!(p.appliedOffer || p.offer);
    return priced || flagged;
  });
}

/** ───────── página ───────── */
export default async function LandingPage() {
  const [banners, cats, offersAll] = await Promise.all([
    getBanners(),
    getCategories(),
    getOffersRaw(),
  ]);

  // Semilla diaria estable (AAAA-MM-DD)
  const seed = new Date().toISOString().slice(0, 10);

  // Rotación diaria: categorías (8) y ofertas (3)
  const catsDaily = shuffleSeed(cats, `${seed}:cats`).slice(0, 8);

  // Elegí el número que querés mostrar (3 como en tus capturas)
  const OFFERS_COUNT = 3;
  const offersDaily = shuffleSeed(offersAll, `${seed}:offers`).slice(
    0,
    OFFERS_COUNT
  );

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      {/* HERO full-bleed */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <HeroSlider items={banners} />
      </div>

      {/* Secciones */}
      <CategoriesRow cats={catsDaily} />
      <OffersCarousel items={offersDaily} />

      {/* Footer mínimo */}
      <footer className="mt-8 bg-emerald-50">
        <div className="mx-auto max-w-7xl px-4 py-10 grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Zona Natural</h3>
            <p className="text-gray-600">Productos naturales, saludables y ricos.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Links</h3>
            <ul className="space-y-1 text-gray-700">
              <li><a className="hover:underline" href="/catalogo">Tienda</a></li>
              <li><a className="hover:underline" href="#">Recetas</a></li>
              <li><a className="hover:underline" href="#">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Redes</h3>
            <ul className="space-y-1 text-gray-700">
              <li><a className="hover:underline" href="#ig">Instagram</a></li>
              <li><a className="hover:underline" href="#fb">Facebook</a></li>
            </ul>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </>
  );
}
