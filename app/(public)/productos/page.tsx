// app/(public)/productos/page.tsx
import ProductGrid from './ProductGrid';

export const runtime = 'edge';
export const revalidate = 60;

export type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null };

export type Product = {
  id: number;
  name: string;
  slug: string;
  cover?: string | null;
  coverUrl?: string | null;
  images?: ProductImage[] | null;
  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;
  hasDiscount?: boolean;
  discountPercent?: number | null;
  status?: 'ACTIVE' | 'AGOTADO' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' | string;
};

function normalizeProduct(raw: any): Product {
  const price =
    typeof raw?.price === 'number'
      ? raw.price
      : typeof raw?.priceFinal === 'number'
      ? raw.priceFinal
      : typeof raw?.priceOriginal === 'number'
      ? raw.priceOriginal
      : null;

  const cover: string | null = raw?.cover ?? raw?.coverUrl ?? raw?.images?.[0]?.url ?? null;

  return {
    id: Number(raw?.id),
    name: String(raw?.name ?? ''),
    slug: String(raw?.slug ?? ''),
    cover,
    coverUrl: raw?.coverUrl ?? null,
    images: raw?.images ?? null,
    price,
    priceOriginal: raw?.priceOriginal ?? null,
    priceFinal: raw?.priceFinal ?? null,
    hasDiscount: Boolean(raw?.hasDiscount ?? false),
    discountPercent: typeof raw?.discountPercent === 'number' ? raw.discountPercent : null,
    status: typeof raw?.status === 'string' ? raw.status : undefined,
  };
}

type ProductsApiResp = {
  items?: any[];
  data?: any[];
  products?: any[];
  results?: any[];
  total?: number;
  page?: number;
  perPage?: number;
};

async function getData(page = 1, perPage = 12): Promise<{
  items: Product[];
  total: number;
  page: number;
  perPage: number;
}> {
  // Preferimos absoluta con CF_PAGES_URL (Cloudflare) o NEXT_PUBLIC_BASE_URL.
  const base =
    process.env.CF_PAGES_URL?.replace(/\/+$/, '') ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, '') ||
    '';

  const qs = `page=${page}&perPage=${perPage}&sort=-id&_ts=${Date.now()}`;
  const url = `${base}/api/public/catalogo?${qs}`; // si base=='' queda relativa

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      // Log útil en Functions logs de Cloudflare
      console.error('[productos] catálogo HTTP', res.status, res.statusText);
      return { items: [], total: 0, page, perPage };
    }

    const data = (await res.json()) as ProductsApiResp;
    const rawItems: any[] = data.items ?? data.data ?? data.products ?? data.results ?? [];
    const items: Product[] = rawItems.map(normalizeProduct);
    const total: number = typeof data.total === 'number' ? data.total : items.length;

    return {
      items,
      total,
      page: typeof data.page === 'number' ? data.page : page,
      perPage: typeof data.perPage === 'number' ? data.perPage : perPage,
    };
  } catch (e) {
    console.error('[productos] fetch catálogo falló:', e);
    return { items: [], total: 0, page, perPage };
  }
}

export default async function ProductosPage(props: any) {
  const sp = props?.searchParams ?? {};
  const page = Math.max(1, parseInt(String(sp.page ?? '1'), 10) || 1);
  const perPage = Math.max(1, parseInt(String(sp.perPage ?? '8'), 10) || 8);

  const { items, total } = await getData(page, perPage);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Productos</h1>
      <p style={{ marginBottom: 16 }}>
        {total} resultado{total === 1 ? '' : 's'}
      </p>

      <ProductGrid items={items} />
    </main>
  );
}
