import { currency, siteUrl } from "@/lib/site";

type PublicProduct = {
  slug: string;
  priceOriginal: number | null;
  priceFinal: number | null;
};

async function getProduct(slug: string): Promise<PublicProduct | null> {
  const base = process.env.SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/public/producto/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok ? (json.item as PublicProduct) : null;
  } catch {
    return null;
  }
}

export default async function Head({ params }: { params: { slug: string } }) {
  const p = await getProduct(params.slug);
  const price = p?.priceFinal ?? p?.priceOriginal ?? null;

  // No duplicamos og:type; lo maneja generateMetadata (website).
  // Acá solo metemos product:* con atributo property=, que muchos scrapers esperan.
  return (
    <>
      {price != null && (
        <>
          <meta property="product:price:amount" content={String(price)} />
          <meta property="product:price:currency" content={currency} />
        </>
      )}
      <link rel="canonical" href={`${siteUrl}/producto/${params.slug}`} />
    </>
  );
}