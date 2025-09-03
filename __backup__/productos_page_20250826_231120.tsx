import Link from 'next/link';
import type { Metadata, Robots } from 'next';
import { siteName, siteUrl } from '@/lib/site';

type CatalogItem = {
  id: number;
  name: string;
  slug: string;
  cover?: string | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;
  hasDiscount?: boolean;
  discountPercent?: number;
};

function qsFromSearchParams(sp: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(sp || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => x != null && qs.append(k, String(x)));
    else if (v != null) qs.set(k, String(v));
  });
  return qs;
}

async function fetchTotal(searchParams: Record<string, string | string[] | undefined>) {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const qs = qsFromSearchParams(searchParams);
  // para el total no necesitamos paginar
  qs.delete('page');
  qs.delete('perPage');
  const res = await fetch(`${base}/api/public/catalogo?${qs.toString()}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return { total: 0, perPage: 20 };
  const json = await res.json();
  return { total: Number(json?.total ?? 0), perPage: Number(json?.perPage ?? 20) };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const qs = qsFromSearchParams(searchParams);
  qs.delete('page');
  qs.delete('perPage');
  const canonical = `${siteUrl}/productos${qs.toString() ? `?${qs.toString()}` : ''}`;

  // Heurística de noindex:
  // - Más de 3 filtros "reales" (excluye page, perPage, sort)
  // - Página muy alta o fuera de rango (> pageCount + 3)
  const skipKeys = new Set(['page', 'perPage', 'sort']);
  const filterCount = Object.entries(searchParams || {}).filter(
    ([k, v]) => !skipKeys.has(k) && v != null && String(v).trim() !== '',
  ).length;

  const pageNum =
    Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page) || 1;
  const sort = String(
    Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort || '-id',
  );

  const { total, perPage } = await fetchTotal(searchParams);
  const pageCount = Math.max(1, Math.ceil(total / (perPage || 20)));

  const shouldNoindex = filterCount > 3 || pageNum > Math.max(pageCount + 3, 100);

  const robots: Robots = {
    index: !shouldNoindex,
    follow: true,
    nocache: false,
    googleBot: {
      index: !shouldNoindex,
      follow: true,
    },
  };

  return {
    title: `Productos | ${siteName}`,
    description:
      'Descubrí productos naturales con ofertas y filtros por categoría, etiquetas y precio.',
    alternates: { canonical },
    robots,
    // (Sugerencia futura: agregar 'other' con prev/next como <meta> o head.tsx específico si lo necesitás)
  };
}

async function fetchCatalog(searchParams: Record<string, string | string[] | undefined>) {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const qs = qsFromSearchParams(searchParams);
  if (!qs.has('perPage')) qs.set('perPage', '20');
  const res = await fetch(`${base}/api/public/catalogo?${qs.toString()}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return { items: [] as CatalogItem[], total: 0, page: 1, perPage: 20 };
  const json = await res.json();
  return {
    items: (json?.items ?? []) as CatalogItem[],
    total: Number(json?.total ?? 0),
    page: Number(json?.page ?? 1),
    perPage: Number(json?.perPage ?? 20),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { items, total, page, perPage } = await fetchCatalog(searchParams);

  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: items.map((p, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * perPage + (i + 1),
      url: `${siteUrl}/producto/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <div style={{ padding: 16 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
      />
      <h1 style={{ margin: '4px 0 16px', fontSize: 24 }}>Productos</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 16,
        }}
      >
        {items.map((p) => {
          const price = p.priceFinal ?? p.priceOriginal ?? null;
          return (
            <Link
              key={p.id}
              href={`/producto/${p.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    background: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.cover ? (
                    <img
                      src={p.cover}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: '#aaa' }}>Sin imagen</span>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                  {price != null && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800 }}>${price.toFixed(2)}</span>
                      {p.hasDiscount && p.priceOriginal != null && (
                        <span style={{ textDecoration: 'line-through', color: '#888' }}>
                          ${p.priceOriginal.toFixed(2)}
                        </span>
                      )}
                      {p.hasDiscount && typeof p.discountPercent === 'number' && (
                        <span
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 999,
                            fontSize: 12,
                          }}
                        >
                          -{p.discountPercent}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 16, color: '#666' }}>
        {total} resultados · Página {page}
      </div>
    </div>
  );
}
