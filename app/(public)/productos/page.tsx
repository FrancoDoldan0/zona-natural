// app/(public)/productos/page.tsx
import ProductGrid from './ProductGrid';

export const runtime = 'edge';
export const revalidate = 60;

export type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null };

export type Product = {
  id: number;
  name: string;
  slug: string;

  // catálogo puede traer "cover", detalle puede traer "coverUrl" o "images"
  cover?: string | null;
  coverUrl?: string | null;
  images?: ProductImage[] | null;

  // precios: distintos endpoints usan distintos campos
  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;

  hasDiscount?: boolean;
  discountPercent?: number | null;

  // ✅ incluimos estado para mostrar “AGOTADO” en la card
  status?: 'ACTIVE' | 'AGOTADO' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' | string;
};

// Evitamos headers() en Next 15: usamos BASE_URL pública
function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

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
    status: typeof raw?.status === 'string' ? raw.status : undefined, // ✅ importante
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
  const url = `${baseUrl()}/api/public/catalogo?page=${page}&perPage=${perPage}&sort=-id`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' }, // 👈 pedimos JSON explícitamente
  });
  if (!res.ok) throw new Error(`Catálogo: ${res.status} ${res.statusText}`);

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

      {/* Client Component: maneja <img> con onError sin romper RSC */}
      <ProductGrid items={items} />
    </main>
  );
}
