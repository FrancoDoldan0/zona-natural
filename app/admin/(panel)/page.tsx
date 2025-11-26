// app/admin/(panel)/page.tsx
export const runtime = 'edge';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/* ───────── Tipos mínimos para stats ───────── */
type PublicProduct = {
  id: number;
  name: string;
  slug: string;
};

type PublicCategory = {
  id: number;
  name: string;
  slug?: string;
};

type PublicOffer = {
  id: number;
  title?: string;
  startAt?: string | null;
  endAt?: string | null;
};

type PublicBanner = {
  id: number;
  title?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  isActive?: boolean;
  active?: boolean;
};

/* ───────── helpers de fetch a APIs públicas ───────── */

async function safeJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as T | null;
    return data;
  } catch {
    return null;
  }
}

function normalizeBannerStatus(b: PublicBanner): 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED' {
  if (b.status) return b.status;
  const act =
    typeof b.isActive === 'boolean'
      ? b.isActive
      : typeof b.active === 'boolean'
      ? b.active
      : true;
  return act ? 'ACTIVE' : 'INACTIVE';
}

async function getCatalogSummary(): Promise<{ total: number; items: PublicProduct[] }> {
  // Probamos con "raw", luego "all" y finalmente sin status
  const statuses = ['raw', 'all', ''];
  for (const st of statuses) {
    const qp = new URLSearchParams();
    qp.set('perPage', '5');
    qp.set('sort', '-id');
    if (st) qp.set('status', st);

    const data: any = await safeJson(`/api/public/catalogo?${qp.toString()}`);
    if (!data) continue;

    const items: any[] =
      data.items ??
      data.data ??
      data.products ??
      data.results ??
      (Array.isArray(data) ? data : []);

    const total: number =
      typeof data.total === 'number'
        ? data.total
        : typeof data.count === 'number'
        ? data.count
        : items.length;

    if (items.length || total) {
      return {
        total,
        items: items as PublicProduct[],
      };
    }
  }

  return { total: 0, items: [] };
}

async function getPublicCategories(): Promise<PublicCategory[]> {
  const data: any = await safeJson('/api/public/categories');
  if (!data) return [];
  const list: any[] = Array.isArray(data) ? data : data.items ?? [];
  return list as PublicCategory[];
}

async function getPublicOffers(): Promise<PublicOffer[]> {
  const data: any = await safeJson('/api/public/offers');
  if (!data) return [];
  const list: any[] = Array.isArray(data) ? data : data.items ?? [];
  return list as PublicOffer[];
}

async function getPublicBanners(): Promise<PublicBanner[]> {
  const data: any = await safeJson('/api/public/banners');
  if (!data) return [];
  const list: any[] = Array.isArray(data) ? data : data.items ?? [];
  return list as PublicBanner[];
}

async function checkPublicCatalogOk(): Promise<boolean> {
  // usamos el mismo truco de status=raw/all para no marcar error falso
  const statuses = ['raw', 'all', ''];
  for (const st of statuses) {
    const qp = new URLSearchParams();
    qp.set('perPage', '1');
    if (st) qp.set('status', st);
    const data = await safeJson(`/api/public/catalogo?${qp.toString()}`);
    if (data) return true;
  }
  return false;
}

/* ───────── Página ───────── */

export default async function AdminHome() {
  // Guardía de login (middleware + layout también protegen)
  const store = await cookies();
  const token =
    store.get('admin_token')?.value ??
    store.get('__session')?.value ??
    store.get('token')?.value ??
    null;

  if (!token) {
    redirect('/admin/login?next=/admin');
  }

  const [
    { total: totalProducts, items: recentProducts },
    categories,
    offers,
    banners,
    publicApiOk,
  ] = await Promise.all([
    getCatalogSummary(),
    getPublicCategories(),
    getPublicOffers(),
    getPublicBanners(),
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
  // Si la API pública ya filtra activos, esto será parecido a banners.length
  const activeBanners = normBanners.filter((b) => b.status === 'ACTIVE').length || banners.length;

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
