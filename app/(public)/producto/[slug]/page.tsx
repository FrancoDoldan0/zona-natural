// app/(public)/producto/[slug]/page.tsx
export const runtime = "edge";
export const revalidate = 30;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";

import ProductCard from "@/components/ui/ProductCard";
import QtyWhatsApp from "@/components/product/QtyWhatsApp";

import { fmtPrice } from "@/lib/price";
import { normalizeProduct, toR2Url } from "@/lib/product";

import { headers } from "next/headers";
import Link from "next/link";

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
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ───────── fetch producto + relacionados ───────── */
async function getProductBySlug(slug: string) {
  // Estrategia tolerante: probamos variantes del endpoint/params
  const attempts = [
    `/api/public/producto/${encodeURIComponent(slug)}`,
    `/api/public/product/${encodeURIComponent(slug)}`,
    `/api/public/catalogo?status=all&slug=${encodeURIComponent(slug)}&perPage=1`,
    `/api/public/catalogo?status=raw&slug=${encodeURIComponent(slug)}&perPage=1`,
  ];

  for (const p of attempts) {
    const data: any = await safeJson(await abs(p));
    if (!data) continue;

    // a) /producto/:slug → objeto
    if (data && !Array.isArray(data) && !Array.isArray((data as any).items)) {
      return data;
    }
    // b) /catalogo → { items: [...] } o array
    const list: any[] = Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray(data)
      ? data
      : [];
    if (list.length) return list[0];
  }
  return null;
}

async function getRelated(product: any) {
  const catId =
    product?.categoryId ??
    product?.category?.id ??
    product?.categoriaId ??
    product?.categoria?.id ??
    null;

  const url =
    catId != null
      ? `/api/public/catalogo?status=all&categoryId=${catId}&perPage=12&sort=-id`
      : `/api/public/catalogo?status=all&perPage=12&sort=-sold`;

  const data: any = await safeJson(await abs(url));
  const items: any[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  // fuera el mismo producto si coincide slug/id
  return items.filter(
    (x) => String(x?.id) !== String(product?.id) && String(x?.slug || "") !== String(product?.slug || "")
  );
}

/* ───────── Página ───────── */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const raw = await getProductBySlug(slug);
  if (!raw) {
    // 404 nativo de Next si no existe
    return (
      <>
        <InfoBar />
        <Header />
        <MainNav />
        <main className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Producto no encontrado</h1>
          <p className="mt-2 text-gray-600">Volvé al <Link href="/catalogo" className="text-emerald-700 underline">catálogo</Link>.</p>
        </main>
      </>
    );
  }

  const p = normalizeProduct(raw);
  const img = toR2Url(p.image);

  const relatedRaw = await getRelated(raw);
  const related = relatedRaw.map(normalizeProduct);

  // ───────── Sucursales (igual que landing) ─────────
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

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* migas */}
        <nav className="text-sm text-gray-600">
          <Link href="/catalogo" className="hover:underline">Catálogo</Link> /{" "}
          <span className="text-gray-800">{p.title}</span>
        </nav>

        {/* cabecera */}
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* imagen */}
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-emerald-100 bg-emerald-50">
            <div className="aspect-[4/3]">
              <img
                src={img}
                alt={p.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          {/* info */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-semibold">{p.title}</h1>
            {p.brand ? <p className="text-sm text-gray-500">{p.brand}</p> : null}

            {/* precios */}
            <div className="text-xl">
              {p.originalPrice && p.price && p.price < p.originalPrice ? (
                <>
                  <span className="text-emerald-700 font-semibold">{fmtPrice(p.price)}</span>{" "}
                  <span className="text-gray-500 line-through text-base">{fmtPrice(p.originalPrice)}</span>
                </>
              ) : (
                <span className="text-emerald-700 font-semibold">{fmtPrice(p.price ?? p.originalPrice ?? null)}</span>
              )}
            </div>

            {/* descripción del admin (si existe) */}
            {p.description ? (
              <p className="text-gray-700 whitespace-pre-line">{p.description}</p>
            ) : null}

            {/* cantidad + WhatsApp */}
            <QtyWhatsApp
              productName={p.title}
              defaultQty={1}
              phone="+59897531583"
              // mensaje prellenado incluye slug por si quieren link
              prefilledNote={`Quisiera coordinar la compra de: ${p.title} (${p.slug}).`}
            />

            <div className="pt-2">
              <Link href="/catalogo" className="text-emerald-700 hover:underline text-sm">
                ← Volver al catálogo
              </Link>
            </div>
          </div>
        </div>

        {/* relacionados */}
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
              <p className="col-span-full text-gray-500">No encontramos productos relacionados.</p>
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
