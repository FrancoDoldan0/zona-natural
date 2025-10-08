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
  images?: { url?: string | null; alt?: string | null; key?: string | null; r2Key?: string | null }[];
};

// No usamos base absoluta: en Pages el relativo funciona mejor en SSR/Edge
const R2_BASE =
  (process.env.NEXT_PUBLIC_R2_BASE_URL || process.env.PUBLIC_R2_BASE_URL || '').replace(/\/+$/, '');

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

function resolveImg(src?: string | null) {
  const s = (src || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (R2_BASE) return `${R2_BASE}/${s.replace(/^\/+/, '')}`;
  return s;
}

function imgOf(p: Item): { url: string; alt: string } {
  const first = p.images?.[0] || {};
  const url =
    resolveImg(first.url) ||
    resolveImg((first as any).key) ||
    resolveImg((first as any).r2Key) ||
    '';
  return { url: url || '/placeholder.png', alt: first.alt || p.name };
}

async function getData(qs: URLSearchParams) {
  // categories
  let cats: Cat[] = [];
  try {
    const res = await fetch('/api/public/categories', { next: { revalidate: 60 } });
    const j: any = await res.json().catch(() => ({}));
    cats = (j?.items ?? []) as Cat[];
  } catch {}

  // list
  let raw: any = {};
  try {
    const res = await fetch(`/api/public/catalogo?${qs.toString()}`, { cache: 'no-store' });
    raw = await res.json().catch(() => ({}));
  } catch {}

  const items: Item[] = (raw.items ?? raw.data ?? raw.products ?? raw.rows ?? []) as Item[];
  const page = Number(raw.page) || 1;
  const perPage = Number(raw.perPage) || 12;
  const total = Number.isFinite(raw.total) ? Number(raw.total) : items.length;

  return { cats, data: { items, page, perPage, total } };
}

export default async function Page({
  searchParams,
}: {
  // En Pages/Next puede venir como Promise o como objeto; soportamos ambas
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const sp = (await (searchParams as any)) ?? {};
  const qs = new URLSearchParams();

  // Copiamos todo lo que venga en la URL
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const one of v) if (one != null) qs.append(k, one);
    } else {
      qs.set(k, v);
    }
  }

  // Normalizamos filtros (por si venís desde /categoria/[slug]?id=)
  const cat = (sp as any)?.categoryId ?? (sp as any)?.catId ?? (sp as any)?.category_id;
  if (cat && !qs.get('categoryId')) qs.set('categoryId', String(cat));
  const sub = (sp as any)?.subcategoryId ?? (sp as any)?.subId ?? (sp as any)?.subcategory_id;
  if (sub && !qs.get('subcategoryId')) qs.set('subcategoryId', String(sub));

  const { cats, data } = await getData(qs);
  const items: Item[] = data.items ?? [];
  const page = data.page ?? 1;
  const perPage = data.perPage ?? 12;
  const total = data.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // chips de navegación: categorías principales
  const chips = cats.map((c) => ({
    id: c.id,
    name: c.name,
    href: `/catalogo?categoryId=${c.id}`,
  }));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catálogo</h1>

      {/* chips */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/catalogo"
          className={'border rounded-full px-3 py-1 text-sm ' + (!qs.get('categoryId') && !qs.get('subcategoryId') ? 'bg-gray-200' : '')}
        >
          Todos
        </a>
        {chips.map((c) => (
          <a
            key={c.id}
            href={c.href}
            className={'border rounded-full px-3 py-1 text-sm ' + (String(qs.get('categoryId')) === String(c.id) ? 'bg-gray-200' : '')}
          >
            {c.name}
          </a>
        ))}
      </div>

      {/* grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const img = imgOf(p);
          return (
            <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
              <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
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
          );
        })}
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
