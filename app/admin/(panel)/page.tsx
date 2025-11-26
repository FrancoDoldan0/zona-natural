// app/admin/(panel)/page.tsx
export const runtime = 'edge';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/* ───────── Tipos mínimos para stats ───────── */
type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  status?: string;
};

type AdminOffer = {
  id: number;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
};

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

type AdminBanner = {
  id: number;
  title: string;
  status?: BannerStatus;
  isActive?: boolean;
  active?: boolean;
};

type AdminCategory = {
  id: number;
  name: string;
  slug: string;
};

/* ───────── Helpers de fetch ───────── */

function normalizeBannerStatus(b: AdminBanner): BannerStatus {
  if (b.status) return b.status;
  const act =
    typeof b.isActive === 'boolean'
      ? b.isActive
      : typeof b.active === 'boolean'
      ? b.active
      : true;
  return act ? 'ACTIVE' : 'INACTIVE';
}

async function fetchAdmin(
  path: string,
  cookieHeader: string | null,
  init?: RequestInit,
) {
  const headers: HeadersInit = {
    ...(init?.headers || {}),
  };
  if (cookieHeader) {
    // reenviamos cookies de la request actual a las APIs de admin
    (headers as any).cookie = cookieHeader;
  }

  return fetch(path, {
    cache: 'no-store',
    next: { revalidate: 0 },
    ...init,
    headers,
  });
}

async function getProductsSummary(cookieHeader: string | null): Promise<{
  total: number;
  items: AdminProduct[];
}> {
  try {
    // Probamos /products y, si no existe, /productos
    let res = await fetchAdmin('/api/admin/products?limit=5', cookieHeader);
    if (!res.ok && res.status === 404) {
      res = await fetchAdmin('/api/admin/productos?limit=5', cookieHeader);
    }
    if (!res.ok) return { total: 0, items: [] };

    const json: any = await res.json().catch(() => null);
    const items: AdminProduct[] =
      (json?.items as AdminProduct[]) ??
      (json?.data as AdminProduct[]) ??
      (Array.isArray(json) ? (json as AdminProduct[]) : []) ??
      [];

    const total =
      typeof json?.total === 'number' ? json.total : items.length;

    return { total, items };
  } catch {
    return { total: 0, items: [] };
  }
}

async function getCategories(
  cookieHeader: string | null,
): Promise<AdminCategory[]> {
  try {
    const res = await fetchAdmin(
      '/api/admin/categories?take=999',
      cookieHeader,
    );
    if (!res.ok) return [];
    const json: any = await res.json().catch(() => null);
    const items: AdminCategory[] =
      (json?.items as AdminCategory[]) ??
      (Array.isArray(json) ? (json as AdminCategory[]) : []) ??
      [];
    return items;
  } catch {
    return [];
  }
}

async function getOffers(cookieHeader: string | null): Promise<AdminOffer[]> {
  try {
    const res = await fetchAdmin('/api/admin/offers?all=1', cookieHeader);
    if (!res.ok) return [];
    const json: any = await res.json().catch(() => null);
    const items: AdminOffer[] =
      (json?.items as AdminOffer[]) ??
      (Array.isArray(json) ? (json as AdminOffer[]) : []) ??
      [];
    return items;
  } catch {
    return [];
  }
}

async function getBanners(
  cookieHeader: string | null,
): Promise<AdminBanner[]> {
  try {
    const res = await fetchAdmin('/api/admin/banners?all=1', cookieHeader);
    if (!res.ok) return [];
    const json: any = await res.json().catch(() => null);
    const items: AdminBanner[] =
      (json?.items as AdminBanner[]) ??
      (Array.isArray(json) ? (json as AdminBanner[]) : []) ??
      [];
    return items;
  } catch {
    return [];
  }
}

async function checkPublicCatalogOk(): Promise<boolean> {
  try {
    const res = await fetch('/api/public/catalogo?perPage=1&status=all', {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ───────── Página ───────── */

export default async function AdminHome() {
  // En Edge/Next 15 cookies() es async
  const store = await cookies();

  // Guardia defensiva (además del middleware y layout)
  const token =
    store.get('admin_token')?.value ??
    store.get('__session')?.value ??
    store.get('token')?.value ??
    null;

  if (!token) {
    redirect('/admin/login?next=/admin');
  }

  // Serializamos las cookies actuales a un header "cookie"
  const cookieHeader =
    store
      .getAll()
      .map((c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ') || null;

  const [
    { total: totalProducts, items: recentProducts },
    categories,
    offers,
    banners,
    publicApiOk,
  ] = await Promise.all([
    getProductsSummary(cookieHeader),
    getCategories(cookieHeader),
    getOffers(cookieHeader),
    getBanners(cookieHeader),
    checkPublicCatalogOk(),
  ]);

  const totalCategories = categories.length;
  const totalOffers = offers.length;

  const now = Date.now();
  const activeOffers = offers.filter((o) => {
    const start = o.startAt ? Date.parse(o.startAt) : null;
    const end = o.endAt ? Date.parse(o.endAt) : null;
    if (start !== null && Number.isFinite(start) && start > now) return false;
    if (end !== null && Number.isFinite(end) && end < now) return false;
    return true;
  }).length;

  const normBanners = banners.map((b) => ({
    ...b,
    status: normalizeBannerStatus(b),
  }));
  const activeBanners = normBanners.filter(
    (b) => b.status === 'ACTIVE',
  ).length;

  const items = [
    { href: '/admin/productos', title: 'Productos', desc: 'Crear, editar, filtrar' },
    { href: '/admin/ofertas', title: 'Ofertas', desc: 'Promos por % o $' },
    { href: '/admin/categorias', title: 'Categorías', desc: 'Gestionar categorías' },
    { href: '/admin/subcategorias', title: 'Subcategorías', desc: 'Gestionar subcategorías' },
    { href: '/admin/banners', title: 'Banners', desc: 'Carrusel / landing' },
    { href: '/admin/uploads', title: 'Uploads', desc: 'Archivos e imágenes' },
  ];

  const recent = recentProducts.slice(0, 5);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header + link al sitio */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Panel de administración</h1>
          <p className="text-sm text-gray-600">
            Resumen rápido de la tienda y accesos a las secciones principales.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Ver sitio público
        </Link>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Productos</p>
          <p className="mt-1 text-2xl font-semibold">{totalProducts}</p>
          <p className="mt-1 text-[11px] text-gray-500">en base de datos</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Ofertas</p>
          <p className="mt-1 text-2xl font-semibold">{totalOffers}</p>
          <p className="mt-1 text-[11px] text-gray-500">
            {activeOffers} actualmente activas
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Categorías</p>
          <p className="mt-1 text-2xl font-semibold">{totalCategories}</p>
          <p className="mt-1 text-[11px] text-gray-500">para organizar el catálogo</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Banners activos</p>
          <p className="mt-1 text-2xl font-semibold">{activeBanners}</p>
          <p className="mt-1 text-[11px] text-gray-500">mostrados en la landing</p>
        </div>
      </section>

      {/* Acciones rápidas */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Acciones rápidas
        </span>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/productos"
            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-white"
          >
            + Nuevo producto
          </Link>
          <Link
            href="/admin/ofertas"
            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-white"
          >
            + Nueva oferta
          </Link>
          <Link
            href="/admin/banners"
            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-white"
          >
            + Nuevo banner
          </Link>
          <Link
            href="/admin/uploads"
            className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-white"
          >
            Subir imagen/archivo
          </Link>
        </div>
      </section>

      {/* Secciones + actividad reciente / estado */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1.4fr]">
        {/* Secciones del panel */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Secciones del panel
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="text-base font-medium">{it.title}</div>
                <div className="mt-1 text-sm text-gray-600">{it.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Columna derecha: actividad + estado */}
        <div className="space-y-4">
          {/* Actividad reciente */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Actividad reciente (productos)
            </h2>
            {recent.length ? (
              <ul className="space-y-1.5 text-sm">
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="ml-1 text-xs text-gray-500">#{p.id}</span>
                    </div>
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="text-xs text-blue-600 underline"
                    >
                      Ver
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">
                Todavía no hay productos recientes para mostrar.
              </p>
            )}
          </div>

          {/* Estado rápido */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Estado rápido
            </h2>
            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 ' +
                  (publicApiOk
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-red-400 bg-red-50 text-red-700')
                }
              >
                <span
                  className={
                    'h-1.5 w-1.5 rounded-full ' +
                    (publicApiOk ? 'bg-emerald-500' : 'bg-red-500')
                  }
                />
                API catálogo {publicApiOk ? 'OK' : 'con errores'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Sesión admin activa
              </span>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-4 text-xs text-gray-400">
        Nota: la protección real de rutas la cubren el <code>middleware</code> y el{' '}
        <code>layout</code> de /admin.
      </p>
    </main>
  );
}
