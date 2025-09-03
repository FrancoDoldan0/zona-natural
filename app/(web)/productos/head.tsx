import { siteUrl } from '@/lib/site';

type SP = Record<string, string | string[] | undefined>;

function toArray(v: string | string[] | undefined): string[] {
  return Array.isArray(v) ? v : v != null ? [String(v)] : [];
}

function qsFromSearchParams(sp: SP) {
  const qs = new URLSearchParams();
  Object.entries(sp || {}).forEach(([k, v]) => {
    for (const val of toArray(v)) {
      if (val != null && String(val).trim() !== '') qs.append(k, String(val));
    }
  });
  return qs;
}

async function fetchTotal(sp: SP) {
  const base = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const qs = qsFromSearchParams(sp);
  // para el total no necesitamos paginar
  qs.delete('page');
  qs.delete('perPage');
  try {
    const res = await fetch(`${base}/api/public/catalogo?${qs.toString()}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { total: 0 };
    const json = await res.json();
    return { total: Number(json?.total ?? 0) };
  } catch {
    return { total: 0 };
  }
}

export default async function Head({ searchParams }: { searchParams: SP }) {
  // page/perPage
  const page = Number(toArray(searchParams.page)[0] ?? '1') || 1;
  const perPage = Number(toArray(searchParams.perPage)[0] ?? '20') || 20;

  // canonical = /productos con todos los filtros salvo page/perPage
  const qsCanon = qsFromSearchParams(searchParams);
  qsCanon.delete('page');
  qsCanon.delete('perPage');
  const canonical = `${siteUrl}/productos${qsCanon.toString() ? `?${qsCanon.toString()}` : ''}`;

  // calcular pageCount desde la API
  const { total } = await fetchTotal(searchParams);
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  // prev/next si corresponde
  const makeHref = (p: number) => {
    const qs = qsFromSearchParams(searchParams);
    if (p <= 1) qs.delete('page');
    else qs.set('page', String(p));
    if (!qs.has('perPage')) qs.set('perPage', String(perPage));
    return `${siteUrl}/productos${qs.toString() ? `?${qs.toString()}` : ''}`;
  };

  const prevHref = page > 1 ? makeHref(page - 1) : null;
  const nextHref = page < pageCount ? makeHref(page + 1) : null;

  return (
    <>
      <link rel="canonical" href={canonical} />
      {prevHref && <link rel="prev" href={prevHref} />}
      {nextHref && <link rel="next" href={nextHref} />}
    </>
  );
}
