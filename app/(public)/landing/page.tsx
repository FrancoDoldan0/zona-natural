// app/(public)/landing/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { headers } from 'next/headers';
import BannerSlider from '@/components/public/BannerSlider';

type PublicBanner = {
  id: number;
  title: string;
  url: string;
  linkUrl: string | null;
};

type PublicOffer = {
  id: number;
  title: string;
  description: string | null;
  discountType: 'PERCENT' | 'AMOUNT';
  discountVal: number | string;
  product?: { id: number; name: string; slug: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

// Construye URL absoluta usando headers, soportando adaptadores donde headers() es Promise
async function abs(path: string) {
  const maybe = headers() as any; // puede ser ReadonlyHeaders o Promise<ReadonlyHeaders>
  const h: any = typeof maybe?.get === 'function' ? maybe : await maybe;

  const proto =
    h?.get?.('x-forwarded-proto') ??
    process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http:') ? 'http' : 'https';

  const host =
    h?.get?.('x-forwarded-host') ??
    h?.get?.('host') ??
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '');

  return host ? `${proto}://${host}${path}` : path;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getBanners(): Promise<PublicBanner[]> {
  try {
    const url = await abs('/api/public/banners'); // sin placement, el API ya filtra por active/fechas
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = (await safeJson<{ items?: any[] }>(r)) ?? { items: [] };

    const items = (j.items ?? []).map((b: any): PublicBanner => ({
      id: Number(b?.id),
      title: String(b?.title ?? ''),
      url: String(b?.url ?? b?.imageUrl ?? ''), // fallback legacy
      linkUrl: (b?.linkUrl ?? b?.link ?? null) as string | null, // fallback legacy
    }));

    return items.filter((b) => !!b.url);
  } catch {
    return [];
  }
}

async function getOffers(): Promise<PublicOffer[]> {
  try {
    const url = await abs('/api/public/offers');
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = (await safeJson<{ items?: PublicOffer[] }>(r)) ?? { items: [] };
    return j.items ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  try {
    const [banners, offers] = await Promise.all([getBanners(), getOffers()]);

    const sliderItems = banners.map((b) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.url,
      link: b.linkUrl ?? null,
    }));

    return (
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold">Zona Natural</h1>
          <p className="opacity-70">Catálogo y ofertas</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Destacados</h2>
          {sliderItems.length ? (
            <BannerSlider items={sliderItems as any} />
          ) : (
            <p className="opacity-70 text-sm">No hay banners para mostrar.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Ofertas activas</h2>
          {offers.length ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {offers.map((o) => {
                const isPercent = String(o.discountType).toUpperCase() === 'PERCENT';
                const valNum = Number((o as any)?.discountVal ?? 0);
                return (
                  <li key={o.id} className="border rounded p-3">
                    <div className="font-medium">{o.title ?? ''}</div>
                    <div className="text-sm opacity-80">
                      {isPercent ? `${valNum}%` : `$ ${valNum.toFixed(2)}`}
                      {' · '}
                      {o.product
                        ? `Producto: ${o.product.name}`
                        : o.category
                        ? `Categoría: ${o.category.name}`
                        : 'General'}
                    </div>
                    {o.description && <p className="text-sm mt-1">{o.description}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="opacity-70">No hay ofertas activas.</p>
          )}
        </section>
      </main>
    );
  } catch {
    return (
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold">Zona Natural</h1>
          <p className="opacity-70">Catálogo y ofertas</p>
        </section>
        <p className="opacity-70">No pudimos cargar el contenido.</p>
      </main>
    );
  }
}
