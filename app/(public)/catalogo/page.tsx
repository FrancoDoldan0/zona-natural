// app/(public)/catalogo/page.tsx
export const runtime = 'edge';
export const revalidate = 30;

type Cat = {
  id: number;
  name: string;
  slug: string;
  subcats?: { id: number; name: string; slug: string }[];
};

type ItemImage = {
  url?: string | null;
  key?: string | null;
  r2Key?: string | null;
  alt?: string | null;
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
  images?: ItemImage[];
};

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

/** Usa absoluta si definiste NEXT_PUBLIC_BASE_URL; si no, deja relativa (ideal en Pages) */
function api(path: string) {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
}

/** Prefija keys/paths con PUBLIC_R2_BASE_URL si no es URL absoluta */
function resolveImage(raw?: string | null) {
  const R2 = (process.env.PUBLIC_R2_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_BASE_URL ||
    ''
  ).replace(/\/+$/, '');
  const v = (raw || '').toString();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return R2 ? `${R2}/${v.replace(/^\/+/, '')}` : v;
}

async function getData(params: URLSearchParams) {
  const [catsRes, listRes] = await Promise.all([
    fetch(api('/api/public/categories'), { next: { revalidate: 60 } }).catch(() => undefined),
    fetch(api(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } }).catch(
      () => undefined,
    ),
  ]);

  const catsJson = (await catsRes?.json().catch(() => ({}))) as { items?: Cat[] } | {};
  const listJson = (await listRes?.json().catch(() => ({}))) as {
    items?: Item[];
    page?: number;
    perPage?: number;
    total?: number;
  } | {};

  return { cats: (('items' in catsJson ? catsJson.items : []) || []) as Cat[], data: listJson };
}

/** Quick helper para armar chips con params */
function qp(sp: Record<string, string | string[] | undefined>, k: string, v?: string) {
  const url = new URLSearchParams();
  for (const [kk, vv] of Object.entries(sp)) {
    if (vv == null) continue;
    if (Array.isArray(vv)) vv.forEach((one) => url.append(kk, one));
    else url.set(kk, vv);
  }
  if (v == null) url.delete(k);
  else url.set(k, v);
  return url.toString();
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
    if (Array.isArray(v)) v.forEach((one) => one != null && qs.append(k, one));
    else qs.set(k, v);
  }

  const { cats, data } = await getData(qs);
  const items: Item[] = (data.items ?? []) as Item[];
  const page = data.page ?? 1;
  const perPage = data.perPage ?? 12;
  const total = data.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // Título/chips dinámicos
  const currentCatId = (sp.categoryId as string | undefined) ?? '';
  const currentSubId = (sp.subcategoryId as string | undefined) ?? '';
  const activeCat = cats.find((c) => String(c.id) === currentCatId);
  const activeSub = cats
    .flatMap((c) => c.subcats || [])
    .find((s) => String(s.id) === currentSubId);
  const title =
    activeCat && activeSub
      ? `${activeCat.name} / ${activeSub.name} — Catálogo`
      : activeCat
      ? `${activeCat.name} — Catálogo`
      : 'Catálogo';

  // Chips (Todos + categorías + sub de la activa)
  const subChips = activeCat?.subcats ?? [];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <div className="flex flex-wrap gap-2">
        <a
          className={'px-3 py-1 rounded-full border ' + (!currentCatId ? 'bg-gray-200' : '')}
          href={`/catalogo?${qp(sp, 'categoryId', undefined)}`}
        >
          Todos
        </a>
        {cats.map((c) => (
          <a
            key={c.id}
            className={
              'px-3 py-1 rounded-full border ' + (String(c.id) === currentCatId ? 'bg-gray-200' : '')
            }
            href={`/catalogo?${qp(sp, 'categoryId', String(c.id))}`}
          >
            {c.name}
          </a>
        ))}
        {subChips.length > 0 && (
          <>
            <span className="opacity-60 px-2">/</span>
            {subChips.map((s) => (
              <a
                key={s.id}
                className={
                  'px-3 py-1 rounded-full border ' + (String(s.id) === currentSubId ? 'bg-gray-200' : '')
                }
                href={`/catalogo?${qp(sp, 'subcategoryId', String(s.id))}`}
              >
                {s.name}
              </a>
            ))}
          </>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const firstImg = (p.images?.[0] ?? {}) as ItemImage;
          const rawImg =
            firstImg.url || firstImg.key || firstImg.r2Key || (p as any)?.coverKey || '';
          const imgSrc = resolveImage(rawImg) || '/favicon.ico';
          const imgAlt = firstImg.alt || p.name;

          return (
            <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
              <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
                <img src={imgSrc} alt={imgAlt} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="font-medium">{p.name}</div>
              {p.priceFinal != null &&
              p.priceOriginal != null &&
              p.priceFinal < p.priceOriginal ? (
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
