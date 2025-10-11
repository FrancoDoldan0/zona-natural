// app/(public)/productos/page.tsx
import ProductGrid from "./ProductGrid";
import { abs, noStoreFetch } from "@/lib/http";
import { normalizeProduct } from "@/lib/product";

export const runtime = "edge";
export const dynamic = "force-dynamic";
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
  status?: string;
};

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

async function fetchCatalog(urlPath: string) {
  const url = await abs(urlPath);
  const res = await noStoreFetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as ProductsApiResp;
  const rawItems: any[] = data.items ?? data.data ?? data.products ?? data.results ?? [];
  const items = rawItems.map(normalizeProduct); // <— normalizamos aquí si querés
  const total: number =
    typeof data.filteredTotal === "number" ? data.filteredTotal :
    typeof data.total === "number" ? data.total :
    rawItems.length;

  return {
    items: rawItems, // mantenemos el shape original para ProductGrid (lo normaliza adentro)
    total,
    page: typeof data.page === "number" ? data.page : 1,
    perPage: typeof data.perPage === "number" ? data.perPage : 12,
  };
}

async function getData(page = 1, perPage = 12) {
  const common = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    sort: "-id",
    _ts: String(Date.now()),
  }).toString();

  try {
    const r1 = await fetchCatalog(`/api/public/catalogo?status=all&${common}`);
    if (r1 && r1.items.length) return r1;
    const r2 = await fetchCatalog(`/api/public/catalogo?status=raw&${common}`);
    if (r2) return r2;
  } catch {}

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
      <p style={{ marginBottom: 16 }}>{total} resultado{total === 1 ? "" : "s"}</p>
      <ProductGrid items={items as any} />
    </main>
  );
}
