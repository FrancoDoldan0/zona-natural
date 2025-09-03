type Img = { url: string; alt: string | null };
type Item = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  appliedOffer?: {
    id: number;
    title: string;
    discountType: 'PERCENT' | 'AMOUNT';
    discountVal: number;
  } | null;
  images: Img[];
  category?: { slug: string; name: string } | null;
};

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

async function getItem(slug: string): Promise<Item | null> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const r = await fetch(`${base}/api/public/producto/${slug}`, { next: { revalidate: 30 } });
  const j = await r.json();
  return j?.item ?? null;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const p = await getItem(params.slug);
  if (!p) return <main className="max-w-4xl mx-auto p-6">No encontrado.</main>;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="aspect-[16/9] bg-black/5 overflow-hidden rounded">
        <img
          src={p.images?.[0]?.url || '/placeholder.png'}
          alt={p.images?.[0]?.alt || p.name}
          className="w-full h-full object-cover"
        />
      </div>
      <h1 className="text-2xl font-semibold">{p.name}</h1>

      {p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal ? (
        <div>
          <div className="text-xl text-green-600 font-semibold">{fmt(p.priceFinal)}</div>
          <div className="line-through opacity-60">{fmt(p.priceOriginal)}</div>
          {p.appliedOffer && (
            <div className="text-sm opacity-80">Oferta: {p.appliedOffer.title}</div>
          )}
        </div>
      ) : (
        <div className="text-xl">{fmt(p.price)}</div>
      )}

      {p.description && <p className="opacity-80">{p.description}</p>}
    </main>
  );
}
