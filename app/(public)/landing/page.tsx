// app/(public)/landing/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 60;

import BannerSlider from '@/components/public/BannerSlider';

type PublicBanner = {
  id: number;
  title: string;
  url: string;            // viene del API
  linkUrl: string | null; // viene del API
};

type PublicOffer = {
  id: number;
  title: string;
  description: string | null;
  discountType: 'PERCENT' | 'AMOUNT';
  discountVal: number;
  product?: { id: number; name: string; slug: string } | null;
  category?: { id: number; name: string; slug: string } | null;
};

// Helper: usa absoluta si definís NEXT_PUBLIC_BASE_URL; si no, usa relativa (ideal en Pages)
function api(path: string) {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
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
    const r = await fetch(api('/api/public/banners?placement=home'), {
      cache: 'no-store',
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];

    const j = (await safeJson<{ items?: any[] }>(r)) ?? { items: [] };
    const items = (j.items ?? []).map((b: any): PublicBanner => ({
      id: Number(b?.id),
      title: String(b?.title ?? ''),
      url: String(b?.url ?? b?.imageUrl ?? ''),                 // fallback legacy
      linkUrl: (b?.linkUrl ?? b?.link ?? null) as string | null, // fallback legacy
    }));

    return items.filter((b) => !!b.url);
  } catch (e) {
    console.error('[landing] getBanners error:', e);
    return [];
  }
}

async function getOffers(): Promise<PublicOffer[]> {
  try {
    const r = await fetch(api('/api/public/offers'), {
      cache: 'no-store',
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const j = (await safeJson<{ items?: PublicOffer[] }>(r)) ?? { items: [] };
    return j.items ?? [];
  } catch (e) {
    console.error('[landing] getOffers error:', e);
    return [];
  }
}

export default async function HomePage() {
  try {
    const [banners, offers] = await Promise.all([getBanners(), getOffers()]);

    // Adaptamos al shape que acepta BannerSlider ({ imageUrl, link } o { url, linkUrl })
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

        {!!sliderItems.length && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Destacados</h2>
            <BannerSlider items={sliderItems} />
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Ofertas activas</h2>
          {offers.length ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {offers.map((o) => (
                <li key={o.id} className="border rounded p-3">
                  <div className="font-medium">{o.title}</div>
                  <div className="text-sm opacity-80">
                    {o.discountType === 'PERCENT'
                      ? `${o.discountVal}%`
                      : `$ ${o.discountVal.toFixed(2)}`}
                    {' · '}
                    {o.product
                      ? `Producto: ${o.product.name}`
                      : o.category
                      ? `Categoría: ${o.category.name}`
                      : 'General'}
                  </div>
                  {o.description && <p className="text-sm mt-1">{o.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="opacity-70">No hay ofertas activas.</p>
          )}
        </section>
      </main>
    );
  } catch (e) {
    // Último escudo para evitar 1101: render sin romper la página
    console.error('[landing] render error:', e);
    return (
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold">Zona Natural</h1>
          <p className="opacity-70">Catálogo y ofertas</p>
        </section>
        <p className="opacity-70">Hubo un problema cargando el contenido.</p>
      </main>
    );
  }
}
