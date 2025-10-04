// app/(public)/landing/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import BannerSlider from '@/components/public/BannerSlider';

type PublicBanner = {
  id: number;
  title: string;
  url: string;            // API pública
  linkUrl: string | null; // API pública
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

// Usa absoluta si definís NEXT_PUBLIC_BASE_URL; sino, relativa.
function api(path: string) {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try { return (await res.json()) as T; } catch { return null; }
}

async function fetchBanners(path: string): Promise<PublicBanner[]> {
  const r = await fetch(api(path), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) return [];
  const j = (await safeJson<{ items?: any[] }>(r)) ?? { items: [] };
  const items = (j.items ?? []).map((b: any): PublicBanner => ({
    id: Number(b?.id),
    title: String(b?.title ?? ''),
    url: String(b?.url ?? b?.imageUrl ?? ''),                 // fallback legacy
    linkUrl: (b?.linkUrl ?? b?.link ?? null) as string | null // fallback legacy
  }));
  return items.filter(b => !!b.url);
}

async function getBanners(): Promise<PublicBanner[]> {
  // 1) intento con placement=home
  const home = await fetchBanners('/api/public/banners?placement=home');
  if (home.length) return home;

  // 2) fallback sin filtro (por si no existe la columna placement)
  return fetchBanners('/api/public/banners');
}

async function getOffers(): Promise<PublicOffer[]> {
  const r = await fetch(api('/api/public/offers'), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) return [];
  const j = (await safeJson<{ items?: PublicOffer[] }>(r)) ?? { items: [] };
  return j.items ?? [];
}

export default async function HomePage() {
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

      {!!sliderItems.length && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Destacados</h2>
          <BannerSlider items={sliderItems as any} />
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
                  {o.discountType === 'PERCENT' ? `${o.discountVal}%` : `$ ${o.discountVal.toFixed(2)}`}
                  {' · '}
                  {o.product ? `Producto: ${o.product.name}` : o.category ? `Categoría: ${o.category.name}` : 'General'}
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
}
