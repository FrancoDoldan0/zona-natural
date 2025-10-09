// app/(public)/landing/page.tsx
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import HeroSlider, { type BannerItem } from "@/components/landing/HeroSlider";
import CategoriesRow from "@/components/landing/CategoriesRow";
import OffersCarousel from "@/components/landing/OffersCarousel";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import Link from "next/link";
import { abs, noStoreFetch } from "@/lib/http";

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
  try {
    const url = await abs("/api/public/banners");
    const res = await noStoreFetch(url);
    if (!res.ok) return [];
    const data: any = await res.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    return (Array.isArray(list) ? list : [])
      .map((b: any, i: number) => ({
        id: Number(b.id ?? i),
        title: String(b.title ?? b.name ?? ""),
        image:
          b.image ?? b.imageUrl
            ? b.image ?? b.imageUrl
            : { url: b.url ?? b.src ?? b.preview ?? b.key ?? b.r2Key ?? "" },
        linkUrl: b.linkUrl ?? b.href ?? null,
      }))
      .filter((x) => !!(typeof x.image === "string" ? x.image : x.image?.url));
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Cat[]> {
  try {
    const url = await abs("/api/public/categories");
    const res = await noStoreFetch(url);
    const data: any = res.ok ? await res.json().catch(() => ({})) : {};
    const list = Array.isArray(data) ? data : data?.items ?? [];
    return (list as Cat[]) || [];
  } catch {
    return [];
  }
}

async function getOffers(): Promise<Prod[]> {
  // Intento normal
  const url1 = await abs("/api/public/catalogo?perPage=24&sort=-id&status=all");
  let res = await noStoreFetch(url1);
  let json: any = res.ok ? await res.json().catch(() => ({})) : {};
  if (!json?.items?.length) {
    // Fallback sin filtros de estado
    const url2 = await abs("/api/public/catalogo?perPage=24&sort=-id&status=raw");
    res = await noStoreFetch(url2);
    json = res.ok ? await res.json().catch(() => ({})) : {};
  }
  const items: Prod[] = (json?.items ?? json?.data ?? []) as Prod[];
  return items
    .filter((p) => {
      const priced =
        p.priceFinal != null &&
        p.priceOriginal != null &&
        p.priceFinal < p.priceOriginal;
      const flagged = !!(p.appliedOffer || p.offer);
      return priced || flagged;
    })
    .slice(0, 16);
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

      {/* Secciones */}
      <CategoriesRow cats={cats} />
      <OffersCarousel items={offers} />

      {/* Footer mínimo */}
      <footer className="mt-8 bg-emerald-50">
        <div className="mx-auto max-w-7xl px-4 py-10 grid gap-6 sm:grid-cols-3 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Zona Natural</h3>
            <p className="text-gray-600">
              Productos naturales, saludables y ricos.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Links</h3>
            <ul className="space-y-1 text-gray-700">
              <li>
                <Link className="hover:underline" href="/catalogo">
                  Tienda
                </Link>
              </li>
              <li>
                <a className="hover:underline" href="#">
                  Recetas
                </a>
              </li>
              <li>
                <a className="hover:underline" href="#">
                  Contacto
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Redes</h3>
            <ul className="space-y-1 text-gray-700">
              <li>
                <a className="hover:underline" href="#ig">
                  Instagram
                </a>
              </li>
              <li>
                <a className="hover:underline" href="#fb">
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <WhatsAppFloat />
    </>
  );
}
