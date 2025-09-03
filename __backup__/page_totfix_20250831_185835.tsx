import Link from 'next/link';
import Image from 'next/image';
import CatalogFilters from '@/components/CatalogFilters';
import { siteUrl } from '@/lib/site';

type Item = {
  id: number;
  name: string;
  slug: string;
  cover?: string | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  hasDiscount?: boolean;
  discountPercent?: number;
};
type Catalog = { ok: boolean; page: number; perPage: number; total: number; items: Item[] };

export const revalidate = 120;

function qsFrom(sp: Record<string, string | string[] | undefined>) {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp || {})) {
    if (Array.isArray(v)) v.forEach((x) => qp.append(k, String(x)));
    else if (v != null && String(v).trim() !== '') qp.set(k, String(v));
  }
  return qp;
}

async function getCatalog(sp: Record<string, string | string[] | undefined>): Promise<Catalog> {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const qs = qsFrom(sp);
  if (!qs.has('perPage')) qs.set('perPage', '20');
  const res = await fetch(`${base}/api/public/catalogo?${qs.toString()}`, { next: { revalidate } });
  if (!res.ok)
    return {
      ok: false,
      page: 1,
      perPage: Number(qs.get('perPage') || 20),
      total: 0,
      items: [],
    } as any;
  return res.json();
}

async function getTags(): Promise<Array<{ id: number; name: string }>> {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/public/tags?onlyActive=1`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    return items
      .map((t: any) => ({ id: Number(t.id), name: String(t.name) }))
      .filter((t) => Number.isFinite(t.id) && t.name);
  } catch {
    return [];
  }
}

function pageHref(sp: Record<string, string | string[] | undefined>, p: number) {
  const qs = qsFrom(sp);
  if (p <= 1) qs.delete('page');
  else qs.set('page', String(p));
  if (!qs.has('perPage')) qs.set('perPage', String(sp.perPage ?? '20'));
  return `/productos${qs.toString() ? `?${qs.toString()}` : ''}`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [data, tags] = await Promise.all([getCatalog(searchParams), getTags()]);
  const items = Array.isArray(data.items) ? data.items : [];
  const page = Number(searchParams.page ?? '1') || 1;
  const perPage = Number(searchParams.perPage ?? data.perPage ?? 20) || 20;
  // === ZN: total y pageCount consistentes con filtros (canónico) ===
  const __znFilterKeys = new Set([
    'onSale',
    'minFinal',
    'maxFinal',
    'match',
    'order',
    'tagId',
    'tagIds',
    'q',
    'search',
  ]);
  const __znHasFilters = Object.entries(searchParams || {}).some(
    ([k, v]) =>
      __znFilterKeys.has(k) && (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== ''),
  );

  // Arreglo seguro desde data (sin depender de 'items' aún no declarado)
  const __znItems = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

  const __znFilteredTotalRaw = (data as any)?.filteredTotal ?? (data as any)?.filtered_count;
  const __znTotalRaw =
    (data as any)?.total ??
    (data as any)?.totalCount ??
    (data as any)?.count ??
    (data as any)?.total_items;

  const __znFilteredNum = Number(__znFilteredTotalRaw);
  const __znTotalNum = Number(__znTotalRaw);

  const totalForView_ZN = Number.isFinite(__znFilteredNum)
    ? __znFilteredNum
    : __znHasFilters
      ? __znItems.length
      : Number.isFinite(__znTotalNum)
        ? __znTotalNum
        : __znItems.length;

  const pageCount_ZN = Math.max(page, Math.max(1, Math.ceil(totalForView_ZN / perPage)));

  const pageCount = Math.max(1, Math.ceil((data.total || 0) / perPage));

  // JSON-LD ItemList (SEO)
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${siteUrl}/producto/${it.slug}`,
      name: it.name,
    })),
  };

  // --- PATCH: totalForView (fallback seguro) ---
  // Preferir filtrado si viene del backend; si no, total general; ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºltimo recurso, cantidad de items.
  const rawFilteredTotal = (data as any)?.filteredTotal ?? (data as any)?.filtered_count;
  const rawTotal =
    (data as any)?.total ??
    (data as any)?.totalCount ??
    (data as any)?.count ??
    (data as any)?.total_items;
  const __tfvF = Number(rawFilteredTotal);
  const __tfvT = Number(rawTotal);
  const totalForView = Number.isFinite(__tfvF)
    ? __tfvF
    : Number.isFinite(__tfvT)
      ? __tfvT
      : Array.isArray(items)
        ? items.length
        : 0;
  return (
    <div style={{ padding: 16 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <h1 style={{ margin: '4px 0 16px', fontSize: 24 }}>Productos</h1>

      {/* Filtros */}
      <CatalogFilters tags={tags} />

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
          gap: 16,
          marginTop: 12,
        }}
      >
        {items.map((p, idx) => {
          const price = p.priceFinal ?? p.priceOriginal ?? null;
          const cover = p.cover || '/placeholder.svg';
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
                    position: 'relative',
                  }}
                >
                  <Image
                    src={cover}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    priority={page === 1 && idx < 3 && !!p.cover}
                  />
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

      {/* PaginaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n */}
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ color: '#666' }}>
          {totalForView_ZN} resultados Ãƒâ€šÃ‚Â· PÃƒÆ’Ã‚Â¡gina {page} de {pageCount_ZN}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {page > 1 && (
            <Link
              href={pageHref(searchParams, page - 1)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
            >
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â
              Anterior
            </Link>
          )}
          {page < pageCount_ZN_ZN && (
            <Link
              href={pageHref(searchParams, page + 1)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
            >
              Siguiente
              ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
