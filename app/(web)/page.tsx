export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import ProductCard from '@/components/web/ProductCard';
import { headers } from 'next/headers';

function baseUrl() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

async function getJSON(path: string) {
  const r = await fetch(`${baseUrl()}${path}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}
async function getJSONSafe(path: string) {
  try {
    return await getJSON(path);
  } catch {
    return null;
  }
}

export default async function Page() {
  const [banners, catalogo] = await Promise.all([
    getJSONSafe('/api/public/banners'),
    getJSONSafe('/api/public/catalogo?page=1&perPage=8&sort=-id'),
  ]);

  const items = Array.isArray(catalogo?.items) ? catalogo!.items : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Banners simples */}
      {Array.isArray(banners?.items) && banners!.items.length > 0 && (
        <div className="grid md:grid-cols-3 gap-3">
          {banners!.items.map((b: any) => (
            <a key={b.id} href={b.link || '#'} className="block overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title} className="w-full h-40 object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Últimos productos */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Novedades</h2>
          <a href="/productos" className="text-sm underline">
            Ver todo
          </a>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.length ? (
            items.map((p: any) => <ProductCard key={p.id} p={p} />)
          ) : (
            <div className="opacity-60">No hay productos.</div>
          )}
        </div>
      </section>
    </div>
  );
}
