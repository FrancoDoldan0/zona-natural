// app/(public)/productos/page.tsx
import { headers } from 'next/headers';
import ProductGrid from './ProductGrid';

export const runtime = 'edge';
export const revalidate = 60;

export type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null };

export type Product = {
  id: number;
  name: string;
  slug: string;
  // catálgo puede traer "cover", detalle puede traer "coverUrl" o "images"
  cover?: string | null;
  coverUrl?: string | null;
  images?: ProductImage[] | null;

  // precios: distintos endpoints usan distintos campos
  price?: number | null;
  priceOriginal?: number | null;
  priceFinal?: number | null;

  hasDiscount?: boolean;
  discountPercent?: number | null;
};

function getBaseUrl() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
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

  // El catálogo trae "cover"; el detalle puede traer "coverUrl" o "images"
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
    hasDiscount: raw?.hasDiscount ?? false,
    discountPercent: raw?.discountPercent ?? null,
  };
}

async function getData(page = 1, perPage = 12) {
  const base = getBaseUrl();
  const url = `${base}/api/public/catalogo?page=${page}&perPage=${perPage}&sort=-id`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Catálogo: ${res.status} ${res.statusText}`);

  const data = await res.json();
  const rawItems: any[] = data.items ?? data.data ?? data.products ?? data.results ?? [];

  const items: Product[] = rawItems.map(normalizeProduct);
  const total: number = data.total ?? items.length;

  return { items, total, page: data.page ?? page, perPage: data.perPage ?? perPage };
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams?: { page?: string; perPage?: string };
}) {
  const page = Number(searchParams?.page ?? 1);
  const perPage = Number(searchParams?.perPage ?? 8);

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
