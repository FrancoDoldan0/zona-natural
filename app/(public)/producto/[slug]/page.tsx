// app/(public)/producto/[slug]/page.tsx
export const runtime = "edge";
export const revalidate = 60;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

// NUEVO: secciones pedidas
import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { fmtPrice } from "@/lib/price";
import { normalizeProduct, toR2Url } from "@/lib/product";
import ProductCard from "@/components/ui/ProductCard";
import QtyWhatsApp from "@/components/product/QtyWhatsApp";

/* ───────── helpers comunes ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {}
  return path;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 }, ...init });
    if (!res.ok) return null as any;
    return (await res.json()) as T;
  } catch {
    return null as any;
  }
}

/* ───────── fetch de producto por slug (robusto a API) ───────── */
type RawItem = Record<string, any>;

async function fetchOneBySlug(slug: string): Promise<RawItem | null> {
  // 1) endpoints de detalle conocidos
  for (const pth of [`/api/public/producto/${slug}`, `/api/public/product/${slug}`]) {
    const data = await safeJson<any>(await abs(pth));
    if (data && typeof data === "object") {
      const raw = (data.item ?? data.product ?? data) as RawItem;
      if (raw && (raw.slug === slug || raw.id)) return raw;
    }
  }

  // 2) búsqueda en catálogo por distintos parámetros
  const keys = ["slug", "query", "q", "search", "term", "name"];
  const statuses = ["all", "raw"];
  for (const status of statuses) {
    for (const key of keys) {
      const qs = new URLSearchParams();
      qs.set("perPage", "48");
      qs.set("status", status);
      qs.set(key, slug);
      const data = await safeJson<any>(await abs(`/api/public/catalogo?${qs}`));
      const list: RawItem[] =
        (data?.items as RawItem[]) ??
        (data?.data as RawItem[]) ??
        (data?.products as RawItem[]) ??
        (data?.results as RawItem[]) ??
        [];
      if (Array.isArray(list) && list.length) {
        const exact = list.find((x) => (x.slug ?? "").toString() === slug);
        return exact ?? list[0];
      }
    }
  }
  return null;
}

/* ───────── metadata (Next 15: params es Promise) ───────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = await fetchOneBySlug(slug);
  const p = raw ? normalizeProduct(raw) : null;
  return {
    title: p ? `${p.title} — Zona Natural` : "Producto — Zona Natural",
    description: p?.subtitle || "Producto natural y saludable.",
  };
}

/* ───────── utilidades (sku/categorías/descripcion/ids) ───────── */
function getSku(raw: RawItem): string | null {
  const v =
    raw.sku ?? raw.SKU ?? raw.codigo ?? raw.code ?? raw.productCode ?? null;
  return v ? String(v) : null;
}
function getCategories(raw: RawItem): string[] {
  const one =
    raw.category?.name ??
    raw.categoria?.name ??
    raw.categoryName ??
    raw.categoria ??
    null;

  const many: any[] =
    raw.categories ??
    raw.categorias ??
    raw.cats ??
    raw.tags ??
    [];

  const names = [
    ...(one ? [one] : []),
    ...many.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
  ];
  return Array.from(new Set(names));
}
function getDescription(raw: RawItem): { html?: string; text?: string } {
  const desc =
    raw.description ??
    raw.desc ??
    raw.bodyHtml ??
    raw.body ??
    raw.content ??
    raw.detalle ??
    raw.details ??
    null;
  if (!desc) return {};
  const s = String(desc).trim();
  if (/<[a-z][\s\S]*>/i.test(s)) return { html: s };
  return { text: s };
}
function getFirstCategoryId(raw: RawItem): number | null {
  const id =
    raw.categoryId ??
    raw.categoriaId ??
    raw.category?.id ??
    raw.categoria?.id ??
    (Array.isArray(raw.categories) && raw.categories[0]?.id) ??
    (Array.isArray(raw.categorias) && raw.categorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}
function getFirstSubcategoryId(raw: RawItem): number | null {
  const id =
    raw.subcategoryId ??
    raw.subcategoriaId ??
    raw.subcategory?.id ??
    raw.subcategoria?.id ??
    (Array.isArray(raw.subcategories) && raw.subcategories[0]?.id) ??
    (Array.isArray(raw.subcategorias) && raw.subcategorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}

/* ───────── relacionados ───────── */
async function fetchRelated(raw: RawItem, excludeSlug: string): Promise<RawItem[]> {
  // 1) por IDs de categoría/subcategoría si están disponibles
  const catId = getFirstCategoryId(raw);
  const subId = getFirstSubcategoryId(raw);
  if (catId || subId) {
    const qs = new URLSearchParams();
    qs.set("status", "all");
    qs.set("perPage", "8");
    qs.set("sort", "-sold");
    if (catId) qs.set("categoryId", String(catId));
    if (subId) qs.set("subcategoryId", String(subId));
    const data = await safeJson<any>(await abs(`/api/public/catalogo?${qs}`));
    let items: RawItem[] = Array.isArray(data?.items) ? data.items : [];
    items = items.filter((x) => (x.slug ?? "") !== excludeSlug).slice(0, 8);
    if (items.length) return items;
  }

  // 2) fallback por nombre de categoría
  const names = getCategories(raw);
  if (names.length) {
    // probamos con el primer nombre
    const name = names[0];
    for (const key of ["q", "query", "search", "term"]) {
      const qs = new URLSearchParams();
      qs.set("status", "all");
      qs.set("perPage", "8");
      qs.set("sort", "-id");
      qs.set(key, name);
      const data = await safeJson<any>(await abs(`/api/public/catalogo?${qs}`));
      let items: RawItem[] = Array.isArray(data?.items) ? data.items : [];
      items = items.filter((x) => (x.slug ?? "") !== excludeSlug);
      if (items.length) return items.slice(0, 8);
    }
  }

  // 3) nada cercano: devolvemos vacío
  return [];
}

/* ───────── Página ───────── */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = await fetchOneBySlug(slug);
  if (!raw) return notFound();

  const p = normalizeProduct(raw);
  const img = toR2Url(p.image);
  const productUrl = await abs(`/producto/${p.slug}`);

  const hasOffer =
    p.price != null &&
    p.originalPrice != null &&
    Number(p.price) < Number(p.originalPrice);

  const sku = getSku(raw);
  const cats = getCategories(raw);
  const desc = getDescription(raw);

  // relacionados
  const relatedRaw = await fetchRelated(raw, p.slug);
  const related = relatedRaw.map((r) => normalizeProduct(r));

  // NUEVO: datos para Ubicaciones (igual que en landing)
  const hours: [string, string][] = [
    ["Lun–Vie", "09:00–19:00"],
    ["Sábado", "09:00–13:00"],
    ["Domingo", "Cerrado"],
  ];
  const encode = (s: string) => encodeURIComponent(s);
  const branches: Branch[] = [
    {
      name: "Las Piedras",
      address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones") +
        "&output=embed",
      hours,
    },
    {
      name: "Maroñas",
      address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo") +
        "&output=embed",
      hours,
    },
    {
      name: "La Paz",
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones") +
        "&output=embed",
      hours,
    },
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones") +
        "&output=embed",
      hours,
    },
  ];

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link href="/catalogo" className="text-sm text-emerald-800 hover:underline">
          ← Volver al catálogo
        </Link>

        {/* Ajuste: galería limitada a ~520px para evitar pixelado */}
        <section className="mt-4 grid gap-6 lg:grid-cols-[minmax(300px,520px)_1fr]">
          {/* Imagen principal (object-contain + padding) */}
          <div className="rounded-2xl overflow-hidden ring-1 ring-emerald-100 bg-emerald-50">
            <div className="relative aspect-[3/4] md:aspect-[4/5] max-h-[560px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={p.title}
                className="absolute inset-0 h-full w-full object-contain p-6"
                sizes="(min-width:1024px) 520px, (min-width:768px) 60vw, 90vw"
                loading="eager"
                decoding="async"
              />
              {p.outOfStock && (
                <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* Panel de info y acción */}
          <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-5">
            {p.brand ? (
              <div className="text-xs uppercase tracking-wide text-emerald-700/80">
                {p.brand}
              </div>
            ) : null}

            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">{p.title}</h1>

            {p.subtitle ? (
              <p className="mt-1 text-gray-600">{p.subtitle}</p>
            ) : null}

            {/* Precio */}
            <div className="mt-4">
              {hasOffer ? (
                <div className="text-lg">
                  <span className="text-emerald-700 font-semibold mr-2">
                    {fmtPrice(p.price)}
                  </span>
                  <span className="line-through opacity-60">{fmtPrice(p.originalPrice)}</span>
                  {p.originalPrice ? (
                    <span className="ml-2 rounded-full bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5">
                      -
                      {Math.round(
                        ((Number(p.originalPrice) - Number(p.price!)) /
                          Number(p.originalPrice)) *
                          100
                      )}
                      %
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="text-lg">
                  {fmtPrice(p.price ?? p.originalPrice ?? null)}
                </div>
              )}

              {!p.outOfStock ? (
                <p className="mt-1 text-xs text-emerald-700">Disponible</p>
              ) : (
                <p className="mt-1 text-xs text-rose-700">Sin stock</p>
              )}
            </div>

            {/* CTA: cantidad + WhatsApp */}
            <div className="mt-6">
              <QtyWhatsApp
                phoneE164="59897531583" // +598 97 531 583
                productTitle={p.title}
                productUrl={productUrl}
                disabled={p.outOfStock}
              />
            </div>

            {/* Datos rápidos */}
            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {sku ? (
                <>
                  <dt className="font-medium text-gray-700">SKU</dt>
                  <dd className="text-gray-900">{sku}</dd>
                </>
              ) : null}
              <dt className="font-medium text-gray-700">Disponibilidad</dt>
              <dd className="text-gray-900">
                {p.outOfStock ? "Sin stock" : "En stock"}
              </dd>
              {cats.length ? (
                <>
                  <dt className="font-medium text-gray-700">Categorías</dt>
                  <dd className="text-gray-900">
                    {cats.join(", ")}
                  </dd>
                </>
              ) : null}
            </dl>

            {/* Descripción del admin */}
            {(desc.html || desc.text) ? (
              <div className="mt-8 pt-6 border-t">
                <h2 className="text-lg font-semibold">Descripción</h2>
                {desc.html ? (
                  <div
                    className="prose prose-sm max-w-none mt-2"
                    dangerouslySetInnerHTML={{ __html: desc.html }}
                  />
                ) : (
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {desc.text}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Productos relacionados */}
        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-semibold">Productos relacionados</h2>
          <div className="mt-4 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard
                key={r.id}
                slug={r.slug}
                title={r.title}
                image={r.image}
                price={r.price ?? undefined}
                originalPrice={r.originalPrice ?? undefined}
                outOfStock={r.outOfStock}
                brand={r.brand ?? undefined}
                subtitle={r.subtitle ?? undefined}
              />
            ))}
            {!related.length && (
              <p className="col-span-full text-sm text-gray-500">
                No encontramos productos similares por ahora.
              </p>
            )}
          </div>
        </section>

        {/* NUEVO: Recetas populares */}
        <div className="mt-12">
          <RecipesPopular />
        </div>

        {/* NUEVO: Ubicaciones */}
        <div className="mt-12">
          <MapHours locations={branches} />
        </div>

        {/* NUEVO: Compromiso sustentable */}
        <div className="mt-12">
          <Sustainability />
        </div>
      </main>
    </>
  );
}
