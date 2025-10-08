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

// Usa absoluta si definiste NEXT_PUBLIC_BASE_URL; si no, relativa
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

  // Parseo robusto sin crear un tipo unión molesto para TS
  let catsJson: any = {};
  let listJson: any = {};
  try {
    catsJson = await catsRes.json();
  } catch {}
  try {
    listJson = await listRes.json();
  } catch {}

  const cats: Cat[] = Array.isArray(catsJson?.items) ? (catsJson.items as Cat[]) : [];
  return { cats, data: (listJson ?? {}) as any };
}

function qp(
  base: URLSearchParams,
  patch: Record<string, string | number | null | undefined>,
) {
  const q = new URLSearchParams(base); // clone
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null || v === '') q.delete(k);
    else q.set(k, String(v));
  }
  // reset page si cambiás filtros
  if ('categoryId' in patch || 'subcategoryId' in patch) q.delete('page');
  return q;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
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

  const catIdStr = first(sp.categoryId);
  const subIdStr = first(sp.subcategoryId);
  const catId = catIdStr && /^\d+$/.test(catIdStr) ? Number(catIdStr) : undefined;
  const subcategoryId = subIdStr && /^\d+$/.test(subIdStr) ? Number(subIdStr) : undefined;

  const currentCat = catId != null ? cats.find((c) => c.id === catId) : undefined;
  const currentSub =
    currentCat && subcategoryId != null
      ? currentCat.subcats?.find((s) => s.id === subcategoryId)
      : undefined;

  const title =
    currentCat && currentSub
      ? `Catálogo — ${currentCat.name} / ${currentSub.name}`
      : currentCat
      ? `Catálogo — ${currentCat.name}`
      : 'Catálogo';

  const items: Item[] = data.items ?? [];
  const page = data.page ?? 1;
  const perPage = data.perPage ?? 12;
  const total = data.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips de categorías */}
      {cats.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <a
            href={`/catalogo?${qp(qs, { categoryId: null, subcategoryId: null }).toString()}`}
            className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap ${
              !currentCat ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-100'
            }`}
          >
            Todas
          </a>
          {cats.map((c) => (
            <a
              key={c.id}
              href={`/catalogo?${qp(qs, { categoryId: c.id, subcategoryId: null }).toString()}`}
              className={`px-3 py-1 rounded-full border text-sm whitespace-nowrap ${
                currentCat?.id === c.id ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-100'
              }`}
              title={c.name}
            >
              {c.name}
            </a>
          ))}
        </div>
      )}

      {/* Chips de subcategorías cuando hay categoría seleccionada */}
      {currentCat?.subcats?.length ? (
        <div className="flex items-center gap-2 overflow-x-auto -mt-2 pb-2" style={{ scrollbarWidth: 'none' }}>
          <a
            href={`/catalogo?${qp(qs, { subcategoryId: null }).toString()}`}
            className={`px-3 py-1 rounded-full border text-xs whitespace-nowrap ${
              !currentSub ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-blue-50'
            }`}
          >
            Todas las subcategorías
          </a>
          {currentCat.subcats.map((s) => (
            <a
              key={s.id}
              href={`/catalogo?${qp(qs, { subcategoryId: s.id }).toString()}`}
              className={`px-3 py-1 rounded-full border text-xs whitespace-nowrap ${
                currentSub?.id === s.id ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-blue-50'
              }`}
              title={s.name}
            >
              {s.name}
            </a>
          ))}
        </div>
      ) : null}

      {/* Grilla */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
            <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
              <img
                src={p.images?.[0]?.url || '/placeholder.png'}
                alt={p.images?.[0]?.alt || p.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
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

      {/* Paginación */}
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
