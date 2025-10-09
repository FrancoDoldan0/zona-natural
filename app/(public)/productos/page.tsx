// app/(public)/productos/page.tsx
import ProductGrid from "./ProductGrid";

export const runtime = "edge";
export const dynamic = "force-dynamic"; // evita prerender en build
export const revalidate = 0;

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
  status?: "ACTIVE" | "AGOTADO" | "INACTIVE" | "DRAFT" | "ARCHIVED" | string;
};

function normalizeProduct(raw: any): Product {
  const price =
    typeof raw?.price === "number"
      ? raw.price
      : typeof raw?.priceFinal === "number"
      ? raw.priceFinal
      : typeof raw?.priceOriginal === "number"
      ? raw.priceOriginal
      : null;

  const cover: string | null =
    raw?.cover ?? raw?.coverUrl ?? raw?.images?.[0]?.url ?? null;

  return {
    id: Number(raw?.id),
    name: String(raw?.name ?? ""),
    slug: String(raw?.slug ?? ""),
    cover,
    coverUrl: raw?.coverUrl ?? null,
    images: raw?.images ?? null,
    price,
    priceOriginal: raw?.priceOriginal ?? null,
    priceFinal: raw?.priceFinal ?? null,
    hasDiscount: Boolean(raw?.hasDiscount ?? false),
    discountPercent:
      typeof raw?.discountPercent === "number" ? raw.discountPercent : null,
    status: typeof raw?.status === "string" ? raw.status : undefined,
  };
}

type ProductsApiResp = {
  items?: any[];
  data?: any[];
  products?: any[];
  results?: any[];
  total?: number;
  filteredTotal?: number;
  page?: number;
  perPage?: number;
};

import { abs, noStoreFetch } from "@/lib/http";

async function fetchCatalog(urlPath: string) {
  const url = await abs(urlPath);
  const res = await noStoreFetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as ProductsApiResp;
  const rawItems: any[] = data.items ?? data.data ?? data.products ?? data.results ?? [];
  const items: Product[] = rawItems.map(normalizeProduct);
  const total: number =
    typeof data.filteredTotal === "number"
      ? data.filteredTotal
      : typeof data.total === "number"
      ? data.total
      : items.length;

  return {
    items,
    total,
    page: typeof data.page === "number" ? data.page : 1,
    perPage: typeof data.perPage === "number" ? data.perPage : 12,
  };
}

async function getData(page = 1, perPage = 12): Promise<{
  items: Product[];
  total: number;
  page: number;
  perPage: number;
}> {
  const common = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    sort: "-id",
    _ts: String(Date.now()),
  }).toString();

  // 1) Intento normal (status=all)
  try {
    const r1 = await fetchCatalog(`/api/public/catalogo?status=all&${common}`);
    if (r1 && r1.items.length) return r1;

    // 2) Fallback si el filtro de estado falla
    const r2 = await fetchCatalog(`/api/public/catalogo?status=raw&${common}`);
    if (r2) return r2;
  } catch (e) {
    console.error("[productos] fetch catálogo falló:", e);
  }

  return { items: [], total: 0, page, perPage };
}

export default async function ProductosPage(props: any) {
  const sp = props?.searchParams ?? {};
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const perPage = Math.max(1, parseInt(String(sp.perPage ?? "8"), 10) || 8);

  const { items, total } = await getData(page, perPage);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Productos</h1>
      <p style={{ marginBottom: 16 }}>
        {total} resultado{total === 1 ? "" : "s"}
      </p>

      <ProductGrid items={items} />
    </main>
  );
}
