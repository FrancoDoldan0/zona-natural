// app/(public)/landing/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function safeJson<T>(res: Response): Promise<T | null> {
  try { return (await res.json()) as T; } catch { return null; }
}

async function getBanners(): Promise<PublicBanner[]> {
  try {
    // ✅ sin placement, y ruta relativa para usar el mismo host del deploy
    const r = await fetch('/api/public/banners', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = (await safeJson<{ items?: any[] }>(r)) ?? { items: [] };
    const items = (j.items ?? []).map((b: any): PublicBanner => ({
      id: Number(b?.id),
      title: String(b?.title ?? ''),
      url: String(b?.url ?? b?.imageUrl ?? ''),
      linkUrl: (b?.linkUrl ?? b?.link ?? null) as string | null,
    }));
    return items.filter((b) => !!b.url);
  } catch {
    return [];
  }
}

async function getOffers(): Promise<PublicOffer[]> {
  try {
    const r = await fetch('/api/public/offers', {
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
  // si algo explota, devolvemos una UI mínima (evita 1101)
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
