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

type CatalogResponse = {
  items?: Item[];
  page?: number;
  perPage?: number;
  total?: number;
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

// Resolver URL de imagen (acepta absoluta o key relativa y la prefija con R2)
const R2 = (process.env.PUBLIC_R2_BASE_URL || '').replace(/\/+$/, '');
function resolveImg(raw?: string) {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return R2 ? `${R2}/${v.replace(/^\/+/, '')}` : v;
}

async function getData(
  params: URLSearchParams
): Promise<{ cats: Cat[]; data: CatalogResponse }> {
  const [catsRes, listRes] = await Promise.all([
    fetch(api('/api/public/categories'), { next: { revalidate: 60 } }),
    fetch(api(`/api/public/catalogo?${params.toString()}`), {
      next: { revalidate: 30 },
    }),
  ]);

  const catsJson = (await catsRes.json().catch(() => ({}))) as {
    items?: Cat[];
  };
  const listJson = (await listRes.json().catch(() => ({}))) as CatalogResponse;

  return { cats: (catsJson.items ?? []) as Cat[], data: listJson };
}

// query param helper (garantiza string)
function qp(
  sp: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = sp[key];
  if (v == null) return undefined;
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

  const items: Item[] = data.items ?? [];
  const page = data.page ?? 1;
  const perPage = data.perPage ?? 12;
  const total = data.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const categoryId = Number(qp(sp, 'categoryId'));
  const subcategoryId = Number(qp(sp, 'subcategoryId'));

  const currentCat = Number.isFinite(categoryId)
    ? cats.find((c) => c.id === categoryId)
    : undefined;
  const currentSub =
    Number.isFinite(categoryId) && Number.isFinite(subcategoryId)
      ? currentCat?.subcats?.find((s) => s.id === subcategoryId)
      : undefined;

  const titleParts = [
    currentSub?.name,
    currentCat?.name,
    'Catálogo',
  ].filter(Boolean) as string[];
  const title = titleParts.join(' — ') || 'Catálogo';

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips de navegación (categorías + subcats de la activa) */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/catalogo"
          className={
            'px-3 py-1 rounded-full border ' +
            (!currentCat ? 'bg-gray-200' : '')
          }
        >
          Todos
        </a>
        {cats.map((c) => {
          const href = `/catalogo?categoryId=${c.id}`;
          const active = currentCat?.id === c.id;
          return (
            <a
              key={c.id}
              href={href}
              className={
                'px-3 py-1 rounded-full border ' + (active ? 'bg-gray-200' : '')
              }
            >
              {c.name}
            </a>
          );
        })}
        {currentCat?.subcats?.length
          ? currentCat.subcats.map((s) => {
              const href = `/catalogo?categoryId=${currentCat.id}&subcategoryId=${s.id}`;
              const active = currentSub?.id === s.id;
              return (
                <a
                  key={s.id}
                  href={href}
                  className={
                    'px-3 py-1 rounded-full border ' +
                    (active ? 'bg-gray-200' : '')
                  }
                >
                  {s.name}
                </a>
              );
            })
          : null}
      </div>

      {/* Grilla de productos */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const first = p.images?.[0]?.url || '';
          const img = resolveImg(first);
          const alt = p.images?.[0]?.alt || p.name;

          const hasOffer =
            p.priceFinal != null &&
            p.priceOriginal != null &&
            p.priceFinal < p.priceOriginal;

          return (
            <a
              key={p.id}
              href={`/producto/${p.slug}`}
              className="border rounded p-2 hover:shadow"
            >
              <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
                <img
                  src={img || '/placeholder.png'}
                  alt={alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="font-medium">{p.name}</div>
              {hasOffer ? (
                <div className="text-sm">
                  <span className="text-green-600 font-semibold mr-2">
                    {fmt(p.priceFinal)}
                  </span>
                  <span className="line-through opacity-60">
                    {fmt(p.priceOriginal)}
                  </span>
                  {p.appliedOffer && (
                    <div className="text-xs opacity-80">
                      Oferta: {p.appliedOffer.title}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm">{fmt(p.price)}</div>
              )}
            </a>
          );
        })}
        {!items.length && (
          <p className="opacity-70 col-span-full">No hay resultados.</p>
        )}
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
