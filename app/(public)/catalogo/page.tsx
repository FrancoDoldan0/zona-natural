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
  images?: { url?: string; alt: string | null; key?: string; r2Key?: string }[];
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

/** Resuelve url/key/r2Key usando PUBLIC_R2_BASE_URL si hace falta */
function resolveImageUrl(raw?: { url?: string; key?: string; r2Key?: string } | null) {
  if (!raw) return '';
  const R2 = (process.env.PUBLIC_R2_BASE_URL || process.env.NEXT_PUBLIC_R2_BASE_URL || '')
    .replace(/\/+$/, '');
  const v = (raw.url || raw.key || raw.r2Key || '').toString();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return R2 ? `${R2}/${v.replace(/^\/+/, '')}` : v;
}

async function getData(params: URLSearchParams) {
  const [catsRes, listRes] = await Promise.allSettled([
    fetch(api('/api/public/categories'), { next: { revalidate: 60 } }),
    fetch(api(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } }),
  ]);

  let cats: Cat[] = [];
  try {
    const ok = catsRes.status === 'fulfilled' && catsRes.value.ok;
    const j = ok ? await catsRes.value.json() : {};
    cats = (j?.items ?? []) as Cat[];
  } catch {}

  let data:
    | { items?: Item[]; page?: number; perPage?: number; total?: number }
    | Record<string, never> = {};
  try {
    const ok = listRes.status === 'fulfilled' && listRes.value.ok;
    data = ok ? (await listRes.value.json()) : {};
  } catch {}

  return { cats, data };
}

/** Clona params agregando/modificando pares */
function qp(src: URLSearchParams, kv: Record<string, string | null | undefined>) {
  const q = new URLSearchParams(src);
  for (const [k, v] of Object.entries(kv)) {
    if (v == null) q.delete(k);
    else q.set(k, v);
  }
  return q;
}

export default async function Page(props: {
  // 👇 Tip oficial de Next (no Promise) para cumplir con PageProps
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // Pero toleramos si en runtime llega como Promise (algunos toolchains lo hacen)
  const maybe = (props as any)?.searchParams;
  const sp: Record<string, string | string[] | undefined> =
    maybe && typeof maybe.then === 'function' ? ((await maybe) as any) : (maybe ?? {});

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

  const items: Item[] = (data as any)?.items ?? [];
  const page = (data as any)?.page ?? 1;
  const perPage = (data as any)?.perPage ?? 12;
  const total = (data as any)?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // Título según categoryId/subcategoryId
  const catId = Number(qs.get('categoryId'));
  const subId = Number(qs.get('subcategoryId'));
  const catName = Number.isFinite(catId) ? cats.find((c) => c.id === catId)?.name : undefined;
  const subName = Number.isFinite(subId)
    ? cats.flatMap((c) => c.subcats ?? []).find((s) => s.id === subId)?.name
    : undefined;
  const title =
    subName ? `${subName} — Catálogo` : catName ? `${catName} — Catálogo` : 'Catálogo';

  // Normalizamos imagen principal de cada item
  const normalized = items.map((p) => {
    const first = p.images?.[0] ?? undefined;
    const imgUrl = resolveImageUrl(first);
    return {
      ...p,
      _imgUrl: imgUrl,
      _imgAlt: (first?.alt ?? p.name) || p.name,
    } as any;
  });

  // Chips de navegación (categorías + subcategorías si corresponde)
  const chips = [
    { label: 'Todos', href: '/catalogo', active: !catId && !subId },
    ...cats.map((c) => ({
      label: c.name,
      href: `/catalogo?${qp(qs, { categoryId: String(c.id), subcategoryId: null }).toString()}`,
      active: catId === c.id && !subId,
    })),
    ...(cats
      .find((c) => c.id === catId)
      ?.subcats?.map((s) => ({
        label: s.name,
        href: `/catalogo?${qp(qs, { subcategoryId: String(s.id) }).toString()}`,
        active: subId === s.id,
      })) ?? []),
  ];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      <div className="flex gap-2 flex-wrap">
        {chips.map((c) => (
          <a
            key={c.label}
            href={c.href}
            className={
              'px-3 py-1 rounded-full border text-sm ' +
              (c.active ? 'bg-gray-200 border-gray-300' : 'hover:bg-gray-100')
            }
          >
            {c.label}
          </a>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {normalized.map((p: any) => (
          <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
            <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
              <img
                src={p._imgUrl || '/placeholder.png'}
                alt={p._imgAlt}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                draggable={false}
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
        {!normalized.length && (
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
