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

/** Construye URL absoluta válida en Edge/Cloudflare */
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

async function getBanners(): Promise<BannerItem[]> {
  const data = await safeJson<any>(await abs("/api/public/banners"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return (list as any[]).map((b, i) => ({
    id: Number(b.id ?? i),
    title: String(b.title ?? b.name ?? ""),
    image: b.image ?? b.imageUrl ? (b.image ?? b.imageUrl) : { url: b.url ?? "" },
    linkUrl: b.linkUrl ?? b.href ?? null,
  })).filter((x) => !!(x.image?.url || x.image));
}

async function getCategories(): Promise<Cat[]> {
  const data = await safeJson<any>(await abs("/api/public/categories"));
  const list = Array.isArray(data) ? data : data?.items ?? [];
  return list as Cat[];
}

async function getOffers(): Promise<Prod[]> {
  const data = await safeJson<any>(await abs("/api/public/catalogo?perPage=24&sort=-id"));
  const items: Prod[] = (data?.items ?? []) as Prod[];
  return items.filter((p) => {
    const priced = p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal;
    const flagged = !!(p.appliedOffer || p.offer);
    return priced || flagged;
  }).slice(0, 12);
}

export default async function LandingPage() {
  const [banners, cats, offers] = await Promise.all([
    getBanners(),
    getCategories(),
    getOffers(),
  ]);

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      {/* HERO full-bleed */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <HeroSlider items={banners} />
      </div>

      {/* Secciones centradas como QN */}
      <CategoriesRow cats={cats} />
      <OffersCarousel items={offers} />

      {/* Eliminado el footer interno para evitar duplicado.
          El footer global viene desde app/(public)/layout.tsx */}
      <WhatsAppFloat />
    </>
  );
}
