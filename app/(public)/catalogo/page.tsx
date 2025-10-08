// app/(public)/catalogo/page.tsx
export const runtime = 'edge';
export const revalidate = 30;

import { headers } from 'next/headers';

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
  // imágenes del API pueden venir como { url } o { key } o { r2Key }
  images?: Array<{ url?: string; key?: string; r2Key?: string; alt?: string | null }>;
};

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

/** URL absoluta segura en Edge para APIs */
async function abs(path: string) {
  if (path.startsWith('http')) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  return `${proto}://${host}${path}`;
}

/** Resolver imagen (acepta url completa o key/r2Key de R2) */
const R2_BASE = (process.env.PUBLIC_R2_BASE_URL || '').replace(/\/+$/, '');
function toR2Url(input: unknown): string {
  // Puede venir como string o como objeto con {url | key | r2Key}
  let raw = '';
  if (typeof input === 'string') raw = input;
  else if (input && typeof input === 'object') {
    const o = input as any;
    raw = (o.url ?? o.r2Key ?? o.key ?? '').toString();
  }

  raw = (raw || '').trim();
  if (!raw) return '/placeholder.png';
  if (raw.startsWith('http')) return raw;

  const key = raw.replace(/^\/+/, '');
  if (R2_BASE) return `${R2_BASE}/${key}`;
  // fallback relativo, por si servís assets estáticos con el mismo path
  return key.startsWith('/') ? key : `/${key}`;
}

async function getData(params: URLSearchParams) {
  try {
    const [catsRes, listRes] = await Promise.all([
      fetch(await abs('/api/public/categories'), { next: { revalidate: 60 } }),
      fetch(await abs(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } }),
    ]);

    const catsJson: any = catsRes.ok ? await catsRes.json().catch(() => ({})) : {};
    const listJson: any = listRes.ok ? await listRes.json().catch(() => ({})) : {};

    const cats: Cat[] = Array.isArray(catsJson?.items)
      ? catsJson.items
      : Array.isArray(catsJson)
      ? catsJson
      : [];

    return { cats, data: listJson || {} };
  } catch {
    return { cats: [] as Cat[], data: {} as any };
  }
}

function qp(sp: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((one) => one != null && qs.append(k, one));
    else qs.set(k, v);
  }
  return qs;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = qp(sp);
  const { cats, data } = await getData(qs);

  const items: Item[] = Array.isArray(data?.items) ? (data.items as Item[]) : [];
  const page = Number(data?.page) || 1;
  const perPage = Number(data?.perPage) || 12;
  const total = Number(data?.total) || items.length;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  // Título dinámico (cat/subcat si vienen en la URL)
  const catId = Number(qs.get('categoryId'));
  const subId = Number(qs.get('subcategoryId'));
  const cat = cats.find((c) => c.id === catId);
  const sub = cat?.subcats?.find((s) => s.id === subId);
  const title = (sub ? `${sub.name} · ` : '') + (cat ? `${cat.name} — ` : '') + 'Catálogo';

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips navegación */}
      <div className="flex flex-wrap gap-2">
        <a href="/catalogo" className="px-3 py-1 rounded-full border">
          Todos
        </a>
        {cats.map((c) => (
          <a
            key={c.id}
            href={`/catalogo?categoryId=${c.id}`}
            className={
              'px-3 py-1 rounded-full border ' + (c.id === catId ? 'bg-gray-200' : '')
            }
          >
            {c.name}
          </a>
        ))}
        {!!cat && cat.subcats?.length ? (
          <span className="inline-flex items-center gap-2 ml-2">
            {cat.subcats.map((s) => (
              <a
                key={s.id}
                href={`/catalogo?categoryId=${cat.id}&subcategoryId=${s.id}`}
                className={
                  'px-3 py-1 rounded-full border ' + (s.id === subId ? 'bg-gray-200' : '')
                }
              >
                {s.name}
              </a>
            ))}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const firstImg = (p as any)?.images?.[0];
          const src = toR2Url(firstImg);
          const alt =
            (firstImg?.alt as string | undefined) ||
            (typeof firstImg === 'string' ? undefined : undefined) ||
            p.name;

          return (
            <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
              <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
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
