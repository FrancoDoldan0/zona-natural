// app/(public)/catalogo/page.tsx
export const runtime = 'edge';
export const revalidate = 30;

type Cat = {
  id: number;
  name: string;
  slug: string;
  subcats?: { id: number; name: string; slug: string }[];
};

type Item = {
  id: number;
  name: string;
  slug: string;
  price: number | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  appliedOffer?: {
    id: number;
    title: string;
    discountType: 'PERCENT' | 'AMOUNT';
    discountVal: number;
  } | null;
  images?: { url: string; alt: string | null }[];
};

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

// Helper: usa absoluta si definiste NEXT_PUBLIC_BASE_URL; si no, usa relativa (ideal en Pages)
function api(path: string) {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
}

async function getData(params: URLSearchParams) {
  const [catsRes, listRes] = await Promise.all([
    fetch(api('/api/public/categories'), { next: { revalidate: 60 } }),
    fetch(api(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } }),
  ]);

  const catsJson = await catsRes.json<{ items?: Cat[] }>();
  const listJson = await listRes.json<{ items?: Item[]; page?: number; perPage?: number; total?: number }>();
  return { cats: (catsJson.items ?? []) as Cat[], data: listJson };
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();

  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const one of v) if (one != null) qs.append(k, one);
    } else {
      qs.set(k, v);
    }
  }

  const { cats, data } = await getData(qs);
  const items: Item[] = data.items ?? [];
  const page = data.page ?? 1;
  const perPage = data.perPage ?? 12;
  const total = data.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catálogo</h1>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
            <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
              <img
                src={p.images?.[0]?.url || '/placeholder.png'}
                alt={p.images?.[0]?.alt || p.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-medium">{p.name}</div>
            {p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal ? (
              <div className="text-sm">
                <span className="text-green-600 font-semibold mr-2">{fmt(p.priceFinal)}</span>
                <span className="line-through opacity-60">{fmt(p.priceOriginal)}</span>
                {p.appliedOffer && (
                  <div className="text-xs opacity-80">Oferta: {p.appliedOffer.title}</div>
                )}
              </div>
            ) : (
              <div className="text-sm">{fmt(p.price)}</div>
            )}
          </a>
        ))}
        {!items.length && <p className="opacity-70 col-span-full">No hay resultados.</p>}
      </div>

      {pages > 1 && (
        <nav className="flex gap-2 items-center">
          {Array.from({ length: pages }).map((_, i) => {
            const n = i + 1;
            const url = new URLSearchParams(qs);
            url.set('page', String(n));
            return (
              <a
                key={n}
                href={`/catalogo?${url.toString()}`}
                className={'border rounded px-3 ' + (n === page ? 'bg-gray-200' : '')}
              >
                {n}
              </a>
            );
          })}
        </nav>
      )}
    </main>
  );
}
