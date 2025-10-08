// app/(public)/catalogo/page.tsx
export const runtime = 'edge';
export const revalidate = 30;

type Cat = {
  id: number;
  name: string;
  slug: string;
  subcats?: { id: number; name: string; slug: string }[];
};

type Img = { url?: string; key?: string; r2Key?: string; alt?: string | null } | string | null | undefined;

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
  images?: Img[];
};

const R2_BASE = (process.env.PUBLIC_R2_BASE_URL || process.env.NEXT_PUBLIC_R2_BASE_URL || '')
  .replace(/\/+$/, '');

function resolveImage(img?: Img): string {
  if (!img) return '';
  if (typeof img === 'string') {
    if (/^https?:\/\//i.test(img)) return img;
    return R2_BASE ? `${R2_BASE}/${img.replace(/^\/+/, '')}` : img;
  }
  const raw = (img.url || img.key || img.r2Key || '').toString();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return R2_BASE ? `${R2_BASE}/${raw.replace(/^\/+/, '')}` : raw;
}

function fmt(n: number | null) {
  if (n == null) return '-';
  return '$ ' + n.toFixed(2).replace('.', ',');
}

// Helper: usa absoluta si definiste NEXT_PUBLIC_BASE_URL; si no, relativa
function api(path: string) {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/+$/, '') : '';
  return base ? `${base}${path}` : path;
}

async function safeJson(res: Response) {
  try {
    if (!res?.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function getData(params: URLSearchParams) {
  try {
    const [catsRes, listRes] = await Promise.all([
      fetch(api('/api/public/categories'), { next: { revalidate: 60 } }),
      fetch(api(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } }),
    ]);

    const catsJson: any = await safeJson(catsRes);
    const listJson: any = await safeJson(listRes);

    return {
      cats: (catsJson?.items ?? []) as Cat[],
      data: (listJson && typeof listJson === 'object' ? listJson : {}) as {
        items?: Item[];
        page?: number;
        perPage?: number;
        total?: number;
      },
    };
  } catch {
    return { cats: [] as Cat[], data: {} as any };
  }
}

// Conservar sólo parámetros que usamos
function qp(qs: URLSearchParams, patch: Record<string, string | number | null | undefined>) {
  const keep = new URLSearchParams();
  for (const [k, v] of qs) {
    if (['q', 'page', 'sort', 'categoryId', 'subcategoryId'].includes(k)) keep.append(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '') keep.delete(k);
    else keep.set(k, String(v));
  }
  return keep;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  // ✅ Soporta objeto o promesa (según el modo de Next)
  const spRaw: any =
    (searchParams && typeof (searchParams as any).then === 'function'
      ? await (searchParams as any)
      : searchParams) ?? {};

  // Normalizamos a URLSearchParams
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(spRaw)) {
    if (Array.isArray(v)) v.forEach((x) => x != null && qs.append(k, String(x)));
    else if (v != null) qs.set(k, String(v));
  }

  const { cats, data } = await getData(qs);

  const items: Item[] = Array.isArray(data.items) ? (data.items as Item[]) : [];
  const page = Number.isFinite(Number(data.page)) ? Number(data.page) : 1;
  const perPage = Number.isFinite(Number(data.perPage)) ? Number(data.perPage) : 12;
  const total = Number.isFinite(Number(data.total)) ? Number(data.total) : 0;
  const pages = Math.max(1, Math.ceil(total / perPage));

  // Para título y chips activos
  const catId = Number(qs.get('categoryId') || '');
  const subcatId = Number(qs.get('subcategoryId') || '');
  const activeCat = cats.find((c) => c.id === catId);
  const activeSub = activeCat?.subcats?.find((s) => s.id === subcatId);

  const title =
    activeCat && activeSub
      ? `${activeCat.name} / ${activeSub.name} — Catálogo`
      : activeCat
      ? `${activeCat.name} — Catálogo`
      : 'Catálogo';

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips de navegación */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/catalogo?${qp(qs, { categoryId: null, subcategoryId: null, page: 1 }).toString()}`}
          className={`px-3 py-1 rounded-full border ${!activeCat ? 'bg-gray-200' : ''}`}
        >
          Todos
        </a>
        {cats.map((c) => (
          <a
            key={c.id}
            href={`/catalogo?${qp(qs, { categoryId: c.id, subcategoryId: null, page: 1 }).toString()}`}
            className={`px-3 py-1 rounded-full border ${activeCat?.id === c.id ? 'bg-gray-200' : ''}`}
          >
            {c.name}
          </a>
        ))}
        {!!activeCat?.subcats?.length &&
          activeCat.subcats.map((s) => (
            <a
              key={s.id}
              href={`/catalogo?${qp(qs, { subcategoryId: s.id, page: 1 }).toString()}`}
              className={`px-3 py-1 rounded-full border ${activeSub?.id === s.id ? 'bg-gray-200' : ''}`}
            >
              {s.name}
            </a>
          ))}
      </div>

      {/* Grid de productos */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const firstImg = p.images?.[0];
          const src = resolveImage(firstImg) || '/favicon.ico';
          const alt =
            (typeof firstImg === 'string' ? p.name : (firstImg?.alt as string | null)) || p.name;

          return (
            <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
              <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
                <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
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
            const url = qp(qs, { page: n });
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
