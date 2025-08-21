import type { Metadata } from "next";
import ProductGallery from "@/components/public/ProductGallery";

type ApiProduct = {
  id:number; name:string; slug:string; description:string|null; price:number|null; sku:string|null;
  category: { id:number; name:string; slug:string } | null;
  images: { id:number; url:string; alt:string|null }[];
};

const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/,"");

async function getProduct(slug: string): Promise<ApiProduct | null> {
  const r = await fetch(`${base}/api/public/producto/${slug}`, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return j.item as ApiProduct;
}

export async function generateMetadata({ params }:{ params:{ slug:string } }): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p) return { title: "Producto no encontrado" };
  const title = `${p.name} | Zona Natural`;
  const desc  = p.description || `Producto ${p.name} del catálogo`;
  const img   = p.images?.[0]?.url ? new URL(p.images[0].url, base).toString() : undefined;
  const url   = `${base}/producto/${p.slug}`;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, images: img ? [{ url: img }] : undefined, type: "product" }
  };
}

export default async function ProductPage({ params }:{ params:{ slug:string } }) {
  const p = await getProduct(params.slug);
  if (!p) return <main className="max-w-4xl mx-auto p-6">No encontrado.</main>;

  const img0 = p.images?.[0]?.url ? new URL(p.images[0].url, base).toString() : undefined;
  const jsonLd = {
    "@context":"https://schema.org",
    "@type":"Product",
    name: p.name,
    description: p.description || undefined,
    sku: p.sku || undefined,
    image: p.images?.length ? p.images.map(i => new URL(i.url, base).toString()) : undefined,
    offers: p.price ? {
      "@type":"Offer",
      price: p.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${base}/producto/${p.slug}`
    } : undefined,
    category: p.category?.name
  };

  return (
    <main className="max-w-5xl mx-auto p-6 grid gap-6 md:grid-cols-2">
      <ProductGallery images={p.images} title={p.name} />
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        {p.price!=null && <div>Precio: ${"{"+""+"}"}{p.price}</div>}
        {p.sku && <div>SKU: {p.sku}</div>}
        {p.category && <div>Categoría: {p.category.name}</div>}
        {p.description && <p className="mt-2 whitespace-pre-wrap">{p.description}</p>}
        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </section>
    </main>
  );
}