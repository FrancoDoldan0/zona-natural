// app/(public)/producto/[slug]/page.tsx
export const runtime = "edge";
export const revalidate = 60;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

// Secciones adicionales
import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { fmtPrice } from "@/lib/price";
import { normalizeProduct, toR2Url } from "@/lib/product";
import ProductCard from "@/components/ui/ProductCard";
import AddToCart from "@/components/cart/AddToCart";

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

/* ───────── fetch de producto por slug ───────── */
type RawItem = Record<string, any>;

async function fetchOneBySlug(slug: string): Promise<RawItem | null> {
  for (const pth of [`/api/public/producto/${slug}`, `/api/public/product/${slug}`]) {
    const data = await safeJson<any>(await abs(pth));
    if (data && typeof data === "object") {
      const raw = (data.item ?? data.product ?? data) as RawItem;
      if (raw && (raw.slug === slug || raw.id)) return raw;
    }
  }
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

/* ───────── metadata ───────── */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await fetchOneBySlug(slug);
  const p = raw ? normalizeProduct(raw) : null;
  return {
    title: p ? `${p.title} — Zona Natural` : "Producto — Zona Natural",
    description: p?.subtitle || "Producto natural y saludable.",
  };
}

/* ───────── utilidades ───────── */
function getSku(raw: RawItem, selVariant?: any): string | null {
  if (selVariant?.sku) return String(selVariant.sku);
  const v = raw.sku ?? raw.SKU ?? raw.codigo ?? raw.code ?? raw.productCode ?? null;
  return v ? String(v) : null;
}
function getCategories(raw: RawItem): string[] {
  const one =
    raw.category?.name ?? raw.categoria?.name ?? raw.categoryName ?? raw.categoria ?? null;
  const many: any[] = raw.categories ?? raw.categorias ?? raw.cats ?? raw.tags ?? [];
  const names = [
    ...(one ? [one] : []),
    ...many.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
  ];
  return Array.from(new Set(names));
}
function getDescription(raw: RawItem): { html?: string; text?: string } {
  const desc =
    raw.description ?? raw.desc ?? raw.bodyHtml ?? raw.body ?? raw.content ?? raw.detalle ?? raw.details ?? null;
  if (!desc) return {};
  const s = String(desc).trim();
  if (/<[a-z][\s\S]*>/i.test(s)) return { html: s };
  return { text: s };
}
function getFirstCategoryId(raw: RawItem): number | null {
  const id =
    raw.categoryId ?? raw.categoriaId ?? raw.category?.id ?? raw.categoria?.id ??
    (Array.isArray(raw.categories) && raw.categories[0]?.id) ??
    (Array.isArray(raw.categorias) && raw.categorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}
function getFirstSubcategoryId(raw: RawItem): number | null {
  const id =
    raw.subcategoryId ?? raw.subcategoriaId ?? raw.subcategory?.id ?? raw.subcategoria?.id ??
    (Array.isArray(raw.subcategories) && raw.subcategories[0]?.id) ??
    (Array.isArray(raw.subcategorias) && raw.subcategorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}

/* ───────── relacionados ───────── */
async function fetchRelated(raw: RawItem, excludeSlug: string): Promise<RawItem[]> {
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
  const names = getCategories(raw);
  if (names.length) {
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
  return [];
}

/* ───────── Página ───────── */
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // en este proyecto `searchParams` también es Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const raw = await fetchOneBySlug(slug);
  if (!raw) return notFound();

  // normalizado para campos comunes (títulos, imagen, etc.)
  const p = normalizeProduct(raw);
  const img = toR2Url(p.image);
  const productUrl = await abs(`/producto/${p.slug}`);

  // variantes (ya vienen de la API pública)
  const variants: Array<{
    id: number;
    label: string;
    priceOriginal: number | null;
    priceFinal: number | null;
    sku?: string | null;
  }> = Array.isArray(raw.variants) ? raw.variants.map((v: any) => ({
    id: v.id,
    label: v.label,
    priceOriginal: v.priceOriginal ?? null,
    priceFinal: v.priceFinal ?? (v.priceOriginal ?? v.price ?? null),
    sku: v.sku ?? null,
  })) : [];

  const selIndex = Math.max(0, Math.min(variants.length - 1, parseInt(
    (typeof sp.v === "string" ? sp.v : Array.isArray(sp.v) ? sp.v[0] : "0") || "0",
    10
  ) || 0));
  const selVar = variants.length ? variants[selIndex] : null;

  const effectivePrice = selVar?.priceFinal ?? p.price ?? p.originalPrice ?? null;
  const effectiveOriginal = selVar?.priceOriginal ?? p.originalPrice ?? null;
  const hasOffer = effectivePrice != null && effectiveOriginal != null && effectivePrice < effectiveOriginal;

  const sku = getSku(raw, selVar);
  const desc = getDescription(raw);

  const relatedRaw = await fetchRelated(raw, p.slug);
  const related = relatedRaw.map((r) => normalizeProduct(r));

  // Datos de ubicaciones (como en landing)
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
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones") + "&output=embed",
      hours,
    },
    {
      name: "Maroñas",
      address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encode("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
      embedUrl: "https://www.google.com/maps?q=" + encode("Calle Dr. Capdehourat 2608, 11400 Montevideo") + "&output=embed",
      hours,
    },
    {
      name: "La Paz",
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encode("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + encode("César Mayo Gutiérrez, 15900 La Paz, Canelones") + "&output=embed",
      hours,
    },
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encode("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + encode("Av. José Artigas, 15900 Progreso, Canelones") + "&output=embed",
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

        {/* Imagen más angosta + items centrados verticalmente */}
        <section className="mt-4 grid gap-6 items-center lg:grid-cols-[minmax(280px,460px)_1fr]">
          {/* Imagen principal */}
          <div className="rounded-2xl overflow-hidden ring-1 ring-emerald-100 bg-emerald-50">
            <div className="relative aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={p.title}
                className="absolute inset-0 h-full w-full object-cover"
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
              <div className="text-xs uppercase tracking-wide text-emerald-700/80">{p.brand}</div>
            ) : null}

            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">{p.title}</h1>

            {p.subtitle ? <p className="mt-1 text-gray-600">{p.subtitle}</p> : null}

            {/* Selector de variantes */}
            {variants.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {variants.map((v, i) => {
                  const u = new URLSearchParams();
                  u.set("v", String(i));
                  return (
                    <Link
                      key={v.id}
                      href={`${productUrl}?${u.toString()}`}
                      className={
                        "px-3 py-1 rounded border text-sm " +
                        (i === selIndex ? "bg-emerald-600 text-white border-emerald-600" : "bg-white")
                      }
                      prefetch
                    >
                      {v.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Precio */}
            <div className="mt-4">
              {hasOffer ? (
                <div className="text-lg">
                  <span className="text-emerald-700 font-semibold mr-2">{fmtPrice(effectivePrice!)}</span>
                  <span className="line-through opacity-60">{fmtPrice(effectiveOriginal!)}</span>
                  {effectiveOriginal ? (
                    <span className="ml-2 rounded-full bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5">
                      -
                      {Math.round(((Number(effectiveOriginal) - Number(effectivePrice!)) / Number(effectiveOriginal)) * 100)}%
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="text-lg">{fmtPrice(effectivePrice ?? effectiveOriginal ?? null)}</div>
              )}

              {!p.outOfStock ? (
                <p className="mt-1 text-xs text-emerald-700">Disponible</p>
              ) : (
                <p className="mt-1 text-xs text-rose-700">Sin stock</p>
              )}
            </div>

            {/* CTA: Agregar al carrito */}
            <div className="mt-6">
              <AddToCart
                slug={p.slug}
                title={p.title}
                price={effectivePrice ?? effectiveOriginal ?? null}
                image={img}
                productUrl={productUrl}
                disabled={p.outOfStock}
                // 🆕 pasar variante seleccionada
                variantId={selVar?.id ?? null}
                variantLabel={selVar?.label ?? null}
                variantSku={selVar?.sku ?? null}
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
              <dd className="text-gray-900">{p.outOfStock ? "Sin stock" : "En stock"}</dd>
              {getCategories(raw).length ? (
                <>
                  <dt className="font-medium text-gray-700">Categorías</dt>
                  <dd className="text-gray-900">{getCategories(raw).join(", ")}</dd>
                </>
              ) : null}
            </dl>

            {/* Descripción del admin */}
            {(desc.html || desc.text) ? (
              <div className="mt-8 pt-6 border-t">
                <h2 className="text-lg font-semibold">Descripción</h2>
                {desc.html ? (
                  <div className="prose prose-sm max-w-none mt-2" dangerouslySetInnerHTML={{ __html: desc.html }} />
                ) : (
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">{desc.text}</p>
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
            {!related.length && <p className="col-span-full text-sm text-gray-500">No encontramos productos similares por ahora.</p>}
          </div>
        </section>

        {/* Secciones extra */}
        <div className="mt-12">
          <RecipesPopular />
        </div>
        <div className="mt-12">
          <MapHours locations={branches} />
        </div>
        <div className="mt-12">
          <Sustainability />
        </div>
      </main>
    </>
  );
}
