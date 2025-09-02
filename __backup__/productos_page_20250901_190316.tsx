import Link from "next/link";
import Image from "next/image";
import { siteUrl } from "@/lib/site";

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
    else if (v != null && String(v).trim() !== "") qp.set(k, String(v));
  }
  return qp;
}

async function getCatalog(sp: Record<string, string | string[] | undefined>): Promise<Catalog> {
  const base = process.env.SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const qs = qsFrom(sp);
  if (!qs.has("perPage")) qs.set("perPage", "20");
  const res = await fetch(`${base}/api/public/catalogo?${qs.toString()}`, { next: { revalidate } });
  if (!res.ok) return { ok: false, page: 1, perPage: 20, total: 0, items: [] } as any;
  return res.json();
}

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const data = await getCatalog(searchParams);
  const items = Array.isArray(data.items) ? data.items : [];
  const page = Number(searchParams.page ?? "1") || 1;

  // JSON-LD ItemList (SEO)
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListUnordered",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${siteUrl}/producto/${it.slug}`,
      name: it.name,
    })),
  };

  return (
    <div style={{ padding: 16 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <h1 style={{ margin: "4px 0 16px", fontSize: 24 }}>Productos</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
        {items.map((p) => {
          const price = p.priceFinal ?? p.priceOriginal ?? null;
          const cover = p.cover || "/placeholder.svg";
          return (
            <Link key={p.id} href={`/producto/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ width: "100%", aspectRatio: "1/1", background: "#fafafa", position: "relative" }}>
                  <Image
                    src={cover}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    priority={page === 1}
                  />
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                  {price != null && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800 }}>${price.toFixed(2)}</span>
                      {p.hasDiscount && p.priceOriginal != null && (
                        <span style={{ textDecoration: "line-through", color: "#888" }}>${p.priceOriginal.toFixed(2)}</span>
                      )}
                      {p.hasDiscount && typeof p.discountPercent === "number" && (
                        <span style={{ background: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: 999, fontSize: 12 }}>
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
      <div style={{ marginTop: 16, color: "#666" }}>
        {data.total} resultados · Página {data.page}
      </div>
    </div>
  );
}