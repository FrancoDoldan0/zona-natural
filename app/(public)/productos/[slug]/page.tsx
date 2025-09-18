// app/(public)/productos/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const runtime = 'edge';
export const revalidate = 60;

type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null };
type Category = { id?: number; name?: string; slug?: string };
type Status = 'ACTIVE' | 'AGOTADO' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' | string;

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
  status?: Status;
};

// ---------- Base pública solo para canonical/OG ----------
function baseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.CF_PAGES_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    '';
  if (!env) return '';
  const url = env.startsWith('http') ? env : `https://${env}`;
  return url.replace(/\/+$/, '');
}

function absUrl(u?: string | null) {
  if (!u) return undefined;
  if (u.startsWith('http')) return u;
  const b = baseUrl();
  if (!b) return undefined;
  return u.startsWith('/') ? `${b}${u}` : `${b}/${u}`;
}

// ---------- Data fetching ----------
async function getProduct(slug: string): Promise<Product | null> {
  const url = `/api/public/producto/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Producto: ${res.status} ${res.statusText}`);
  const data = await res.json<any>();
  return (data?.item ?? data ?? null) as Product | null;
}

// ---------- schema.org ----------
function availabilityFromStatus(status?: Status) {
  switch ((status || '').toUpperCase()) {
    case 'AGOTADO':
      return 'https://schema.org/OutOfStock';
    case 'INACTIVE':
    case 'ARCHIVED':
      return 'https://schema.org/Discontinued';
    default:
      return 'https://schema.org/InStock';
  }
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const item = await getProduct(params.slug);
  if (!item) return { title: 'Producto no encontrado', robots: { index: false } };

  const title = `${item.name} | Zona Natural`;
  const description =
    (item.description && item.description.slice(0, 160)) ||
    `Compra ${item.name} en Zona Natural.`;

  const firstImg = item.coverUrl || item.images?.[0]?.url || '/placeholder.jpg';
  const ogImage = absUrl(firstImg);
  const b = baseUrl();
  const canonical = b ? `${b}/productos/${item.slug}` : `/productos/${item.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: any) {
  const item = await getProduct(params.slug);
  if (!item) notFound();

  const firstImg = item.coverUrl || item.images?.[0]?.url || '/placeholder.jpg';
  const imgSrc =
    firstImg?.startsWith('http') || firstImg?.startsWith('/') ? String(firstImg) : `/${firstImg}`;

  const canonicalPath = `/productos/${item.slug}`;
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    sku: item.sku || undefined,
    url: absUrl(canonicalPath),
    image: absUrl(firstImg),
    description: item.description || undefined,
    category: item.category?.name || undefined,
  };
  if (typeof item.price === 'number') {
    jsonLd.offers = {
      '@type': 'Offer',
      price: item.price,
      priceCurrency: 'ARS',
      availability: availabilityFromStatus(item.status),
    };
  }

  const isAgotado = (item.status || '').toUpperCase() === 'AGOTADO';

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ width: '100%', aspectRatio: '4/3', marginBottom: 12, position: 'relative' }}>
            {isAgotado && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  background: '#dc2626',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                AGOTADO
              </span>
            )}
            <img
              src={imgSrc}
              alt={item.name}
              loading="eager"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 8,
                display: 'block',
                background: '#111',
              }}
            />
          </div>

          {(item.images?.length ?? 0) > 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 8,
              }}
            >
              {item.images!.slice(1).map((im, i) => {
                const thumb =
                  im.url?.startsWith('http') || im.url?.startsWith('/')
                    ? String(im.url)
                    : `/${im.url}`;
                return (
                  <div key={`${im.url}-${i}`} style={{ width: '100%', aspectRatio: '4/3' }}>
                    <img
                      src={thumb}
                      alt={im.alt || item.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 6,
                        display: 'block',
                        background: '#111',
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

          {isAgotado && (
            <div
              style={{
                display: 'inline-block',
                marginBottom: 12,
                background: '#dc2626',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 6,
              }}
            >
              AGOTADO
            </div>
          )}

          {item.category?.slug ? (
            <div style={{ marginBottom: 12, opacity: 0.8 }}>
              Categoría:{' '}
              <Link href={`/categoria/${item.category.slug}`}>
                {item.category.name || item.category.slug}
              </Link>
            </div>
          ) : null}

          {isAgotado ? (
            <div style={{ opacity: 0.75, marginBottom: 12 }}>Sin stock</div>
          ) : typeof item.price === 'number' ? (
            <div style={{ fontSize: 22, marginBottom: 12 }}>
              ${item.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          ) : (
            <div style={{ opacity: 0.6, marginBottom: 12 }}>Sin precio</div>
          )}

          {item.sku && <div style={{ marginBottom: 12, opacity: 0.8 }}>SKU: {item.sku}</div>}

          {item.description && (
            <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.description}</p>
          )}
        </div>
      </div>
    </main>
  );
}
