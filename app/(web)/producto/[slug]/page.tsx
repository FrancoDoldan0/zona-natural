import Image from "next/image";
import type { Metadata } from "next";
import { siteName, siteUrl, currency } from "@/lib/site";

type ImageT = { url: string; alt?: string | null };
type PublicProduct = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  images?: ImageT[];
  priceOriginal: number | null;
  priceFinal: number | null;
  hasDiscount?: boolean;
  discountPercent?: number;
  category?: { id:number; name:string; slug:string } | null;
  subcategory?: { id:number; name:string; slug:string } | null;
};

export const revalidate = 300;

async function getProduct(slug: string): Promise<PublicProduct | null> {
  const base = process.env.SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/public/producto/${slug}`, { next: { revalidate } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok ? (json.item as PublicProduct) : null;
  } catch {
    return null;
  }
}

function absUrl(u?: string | null): string | null {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${siteUrl}${u.startsWith("/") ? "" : "/"}${u}`;
}

function toRelativeForNextImage(u?: string | null): string {
  if (!u) return "/placeholder.svg";
  try {
    if (u.startsWith("/")) return u;
    const su = new URL(siteUrl);
    const tu = new URL(u);
    if (su.host === tu.host) {
      return tu.pathname + (tu.search || "");
    }
    return "/placeholder.svg";
  } catch {
    return "/placeholder.svg";
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  const title = product ? `${product.name} | ${siteName}` : `Producto | ${siteName}`;
  const desc  = product?.description || "Producto de catálogo";
  const firstImg = product?.images?.[0]?.url;
  const ogImg = firstImg ? absUrl(firstImg) ?? undefined : undefined;
  const canonical = `${siteUrl}/producto/${params.slug}`;
  const price = product?.priceFinal ?? product?.priceOriginal ?? null;

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title,
      description: desc,
      url: canonical,
      siteName,
      type: "website",
      images: ogImg ? [{ url: ogImg }] : undefined,
    },
    other: {
      "og:type": "product",
      ...(price != null ? { "product:price:amount": String(price) } : {}),
      "product:price:currency": currency,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ogImg ? [ogImg] : undefined,
    },
  };
}

export default async function Page({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <meta name="robots" content="noindex, follow" />
        <h1 style={{fontSize:18,fontWeight:600}}>Se produjo un error</h1>
        <p>No pudimos cargar el producto.</p>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const imageUrlsAbs = images.map(i => absUrl(i?.url)).filter((x): x is string => Boolean(x));
  const displayImg = toRelativeForNextImage(images[0]?.url) || "/placeholder.svg";
  const price = product.priceFinal ?? product.priceOriginal ?? null;

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: imageUrlsAbs.length ? imageUrlsAbs : undefined,
    category: product.category?.name || undefined,
    url: `${siteUrl}/producto/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: currency,
      price: price ?? undefined,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/producto/${product.slug}`,
    },
    brand: product.category?.name || undefined,
  };

  return (
    <div style={{ padding: 16 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:24}}>
        <div>
          <div style={{
            width:"100%", aspectRatio:"1/1", background:"#fafafa", borderRadius:12,
            position:"relative", overflow:"hidden"
          }}>
            <Image
              src={displayImg}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
        <div>
          <h1 style={{margin:"4px 0 8px", fontSize:24}}>{product.name}</h1>
          {price != null && (
            <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:12}}>
              <span style={{fontSize:28, fontWeight:800}}>${price.toFixed(2)}</span>
              {product.hasDiscount && product.priceOriginal != null && (
                <span style={{textDecoration:"line-through", color:"#888"}}>${product.priceOriginal.toFixed(2)}</span>
              )}
              {product.hasDiscount && typeof product.discountPercent === "number" && (
                <span style={{
                  background:"#10b981", color:"#fff", padding:"4px 8px",
                  borderRadius:999, fontWeight:700, fontSize:12
                }}>
                  -{product.discountPercent}%
                </span>
              )}
            </div>
          )}
          {product.description && <p style={{whiteSpace:"pre-wrap"}}>{product.description}</p>}
        </div>
      </div>
    </div>
  );
}