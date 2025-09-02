// app/(public)/productos/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SafeImage from "@/components/SafeImage";

export const runtime = "edge";
export const revalidate = 60;

type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null };
type Category = { id?: number; name?: string; slug?: string };
type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price?: number | null;
  sku?: string | null;
  coverUrl?: string | null;
  images?: ProductImage[] | null;
  category?: Category | null;
};

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function absUrl(u?: string | null) {
  if (!u) return undefined;
  if (u.startsWith("http")) return u;
  const base = getBaseUrl();
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

async function getProduct(slug: string): Promise<Product | null> {
  const base = getBaseUrl();
  const url = `${base}/api/public/producto/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Producto: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data?.item ?? data ?? null) as Product | null;
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const item = await getProduct(params.slug);
  if (!item) {
    return { title: "Producto no encontrado", robots: { index: false } };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || getBaseUrl();
  const title = `${item.name} | Zona Natural`;
  const description =
    (item.description && item.description.slice(0, 160)) ||
    `Compra ${item.name} en Zona Natural.`;

  const firstImg = item.coverUrl || item.images?.[0]?.url || "/placeholder.jpg";
  const ogImage = absUrl(firstImg);
  const canonical = `${siteUrl}/productos/${item.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website", // ← evitar el error de Next (no usar "product")
      url: canonical,
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const item = await getProduct(params.slug);
  if (!item) notFound();

  const firstImg = item.coverUrl || item.images?.[0]?.url || "/placeholder.jpg";
  const imgSrc =
    firstImg?.startsWith("http") || firstImg?.startsWith("/")
      ? String(firstImg)
      : `/${firstImg}`;

  const canonical = `/productos/${item.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    sku: item.sku || undefined,
    url: absUrl(canonical),
    image: absUrl(firstImg),
    description: item.description || undefined,
    category: item.category?.name || undefined,
    offers:
      typeof item.price === "number"
        ? {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "ARS",
            availability: "https://schema.org/InStock",
          }
        : undefined,
  };

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ width: "100%", aspectRatio: "4/3", marginBottom: 12 }}>
            <SafeImage
              src={imgSrc}
              alt={item.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 8,
                display: "block",
                background: "#111",
              }}
            />
          </div>

          {(item.images?.length ?? 0) > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
              }}
            >
              {item.images!.slice(1).map((im, i) => {
                const thumb =
                  im.url?.startsWith("http") || im.url?.startsWith("/")
                    ? String(im.url)
                    : `/${im.url}`;
                return (
                  <div key={`${im.url}-${i}`} style={{ width: "100%", aspectRatio: "4/3" }}>
                    <SafeImage
                      src={thumb}
                      alt={im.alt || item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 6,
                        display: "block",
                        background: "#111",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{item.name}</h1>

          {item.category?.slug ? (
            <div style={{ marginBottom: 12, opacity: 0.8 }}>
              Categoría:{" "}
              <Link href={`/categoria/${item.category.slug}`}>
                {item.category.name || item.category.slug}
              </Link>
            </div>
          ) : null}

          {typeof item.price === "number" ? (
            <div style={{ fontSize: 22, marginBottom: 12 }}>
              $
              {item.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </div>
          ) : (
            <div style={{ opacity: 0.6, marginBottom: 12 }}>Sin precio</div>
          )}

          {item.sku && (
            <div style={{ marginBottom: 12, opacity: 0.8 }}>SKU: {item.sku}</div>
          )}

          {item.description && (
            <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.description}</p>
          )}
        </div>
      </div>
    </main>
  );
}
