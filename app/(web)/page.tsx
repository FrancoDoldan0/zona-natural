// app/(web)/page.tsx
import { headers } from 'next/headers';
// Si ya tenés un ProductCard en esta carpeta, mantené el import:
import ProductCard from './components/ProductCard';

export const runtime = 'edge';
export const revalidate = 60;

type CatalogoResp = {
  items?: any[];
  total?: number;
};

type Category = { id: number; name: string; slug: string };
type CategoriesResp = { items?: Category[] };

type OffersResp = { items?: any[] };

function getBaseUrl() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function Page() {
  const base = getBaseUrl();

  const [catalogoRes, catsRes, offersRes] = await Promise.all([
    fetch(`${base}/api/public/catalogo?perPage=8&sort=-id`, { next: { revalidate: 60 } }),
    fetch(`${base}/api/public/categories`, { next: { revalidate: 300 } }),
    fetch(`${base}/api/public/offers`, { next: { revalidate: 60 } }),
  ]);

  const [catalogo, categories, offers] = await Promise.all([
    catalogoRes.json<CatalogoResp>().catch(() => ({} as CatalogoResp)),
    catsRes.json<CategoriesResp>().catch(() => ({ items: [] as Category[] })),
    offersRes.json<OffersResp>().catch(() => ({} as OffersResp)),
  ]);

  const items: any[] = Array.isArray(catalogo.items) ? catalogo.items : [];
  const cats: Category[] = Array.isArray(categories.items) ? (categories.items as Category[]) : [];
  const promos: any[] = Array.isArray(offers.items) ? offers.items : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Bienvenido</h1>
        <p className="text-sm opacity-80">Novedades y destacados</p>
      </section>

      {/* Categorías */}
      {cats.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Categorías</h2>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <a
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="px-3 py-1 rounded-full border text-sm hover:bg-black/5"
              >
                {c.name}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Ofertas (si tu UI las usa) */}
      {promos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Ofertas</h2>
          <div className="text-sm opacity-80">{promos.length} activas</div>
        </section>
      )}

      {/* Productos del catálogo */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Últimos productos</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item: any) => (
            // Si tu ProductCard espera otra prop, ajustá aquí:
            <ProductCard key={item.id ?? item.slug} item={item} />
          ))}
          {items.length === 0 && <div className="opacity-60">Sin productos para mostrar.</div>}
        </div>
      </section>
    </div>
  );
}
