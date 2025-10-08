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
  // la API puede devolver url absoluta, o bien clave de R2 (key/r2Key/imageKey)
  images?: Array<{ url?: string; alt?: string | null; key?: string; r2Key?: string; imageKey?: string }>;
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

// Base pública de R2 para resolver claves
const R2_BASE = (process.env.NEXT_PUBLIC_R2_BASE_URL || process.env.PUBLIC_R2_BASE_URL || '').replace(
  /\/+$/,
  '',
);

// Resuelve una imagen cualquiera de producto (acepta url absoluta o clave de R2)
function resolveImageR2(img: any): string {
  if (!img) return '';
  const url = (img?.url ?? img?.imageUrl ?? '').toString().trim();
  const key = (img?.r2Key ?? img?.key ?? img?.imageKey ?? '').toString().trim().replace(/^\/+/, '');

  if (url && /^https?:\/\//i.test(url)) return url; // ya es absoluta
  if (key && R2_BASE) return `${R2_BASE}/${key}`;
  if (url && R2_BASE) return `${R2_BASE}/${url.replace(/^\/+/, '')}`;
  return url || '';
}

async function getData(params: URLSearchParams) {
  const catsReq = fetch(api('/api/public/categories'), { next: { revalidate: 60 } });
  const listReq = fetch(api(`/api/public/catalogo?${params.toString()}`), { next: { revalidate: 30 } });

  let cats: Cat[] = [];
  let data: any = {};

  try {
    const r = await catsReq;
    if (r.ok) {
      const j: any = await r.json().catch(() => ({}));
      cats = (j?.items ?? []) as Cat[];
    }
  } catch {
    // ignoramos; mostramos catálogo aunque fallen las categorías
  }

  try {
    const r = await listReq;
    if (r.ok) {
      const j: any = await r.json().catch(() => ({}));
      data = j || {};
    }
  } catch {
    // si falla, devolvemos data vacía y la UI mostrará "No hay resultados"
    data = {};
  }

  return { cats, data };
}

export default async function Page(props: any) {
  // Cloudflare Pages a veces pasa searchParams como Promise; lo resolvemos si hace falta
  const spMaybe = props?.searchParams as
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
    | undefined;

  const sp: Record<string, string | string[] | undefined> =
    spMaybe && typeof (spMaybe as any).then === 'function'
      ? await (spMaybe as any)
      : (spMaybe as any) ?? {};

  // construir QS preservando filtros existentes
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const one of v) if (one != null) qs.append(k, String(one));
    } else {
      qs.set(k, String(v));
    }
  }

  const { cats, data } = await getData(qs);

  const items: Item[] = (data?.items ?? []) as Item[];
  const page = Number(data?.page ?? 1);
  const perPage = Number(data?.perPage ?? 12);
  const total = Number(data?.total ?? 0);
  const pages = Math.max(1, Math.ceil((total || 0) / (perPage || 12)));

  // Filtros seleccionados
  const selCatId = Number(sp.categoryId ?? sp.category ?? '');
  const selSubId = Number(sp.subcategoryId ?? sp.sub ?? '');

  const selCat = cats.find((c) => c.id === selCatId) || null;
  const selSub = selCat?.subcats?.find((s) => s.id === selSubId) || null;

  const title = selSub ? `${selSub.name} — Catálogo` : selCat ? `${selCat.name} — Catálogo` : 'Catálogo';

  // helper para armar href de chips
  const chipHref = (patch: Record<string, string | number | null | undefined>) => {
    const u = new URLSearchParams(qs);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') u.delete(k);
      else u.set(k, String(v));
    }
    u.delete('page'); // al cambiar filtro, volver a página 1
    const s = u.toString();
    return s ? `/catalogo?${s}` : `/catalogo`;
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips de navegación: Todos + categorías + (si corresponde) subcategorías */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/catalogo"
          className={
            'px-3 py-1 rounded-full border text-sm ' +
            (!selCatId && !selSubId ? 'bg-gray-200' : 'hover:bg-gray-50')
          }
        >
          Todos
        </a>

        {cats.map((c) => (
          <a
            key={c.id}
            href={chipHref({ categoryId: c.id, subcategoryId: null })}
            className={
              'px-3 py-1 rounded-full border text-sm ' +
              (selCatId === c.id && !selSubId ? 'bg-gray-200' : 'hover:bg-gray-50')
            }
          >
            {c.name}
          </a>
        ))}

        {!!selCat?.subcats?.length &&
          selCat.subcats.map((s) => (
            <a
              key={s.id}
              href={chipHref({ categoryId: selCat.id, subcategoryId: s.id })}
              className={
                'px-3 py-1 rounded-full border text-sm ' +
                (selSubId === s.id ? 'bg-gray-200' : 'hover:bg-gray-50')
              }
            >
              {s.name}
            </a>
          ))}
      </div>

      {/* Grilla de productos */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const imgUrl = resolveImageR2(p.images?.[0]);
          const alt = p.images?.[0]?.alt ?? p.name;
          const hasDiscount =
            p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal;

        return (
          <a key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
            <div className="aspect-[4/3] bg-black/5 mb-2 overflow-hidden">
              <img
                src={imgUrl || '/placeholder.png'}
                alt={alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="font-medium">{p.name}</div>
            {hasDiscount ? (
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
                className={'border rounded px-3 ' + (n === page ? 'bg-gray-200' : 'hover:bg-gray-50')}
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
