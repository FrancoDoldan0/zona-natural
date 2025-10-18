// app/(public)/catalogo/page.tsx
export const runtime = "edge";
export const revalidate = 30;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

import TestimonialsBadges from "@/components/landing/TestimonialsBadges";
import MapHours, { type Branch } from "@/components/landing/MapHours";

import Link from "next/link";
import { headers } from "next/headers";

// 🆕 unificadas
import ProductCard from "@/components/ui/ProductCard";
import { normalizeProduct } from "@/lib/product";

/* ---------- Tipos ---------- */
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
  status?: string;
  images?: Array<{ url?: string; key?: string; r2Key?: string; alt?: string | null }>;
  cover?: string | null;
  coverUrl?: string | null;
  image?: string | null;
};

/* ---------- helpers ---------- */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
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

// normalizar para búsqueda (casefold + sin acentos)
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "");

// number-safe (acepta string/number)
const toNum = (v: any): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

function matchesItem(p: Item, term: string) {
  const t = norm(term);
  return norm(p.name).includes(t) || norm(p.slug || "").includes(t);
}

function priceFields(raw: any) {
  const price = toNum(raw.price);
  const priceFinal = toNum(raw.priceFinal);
  const priceOriginal = toNum(raw.priceOriginal);
  const hasOffer = priceFinal != null && priceOriginal != null && priceFinal < priceOriginal;
  const best = priceFinal ?? price ?? priceOriginal;
  return { price, priceFinal, priceOriginal, best, hasOffer };
}

/* ---------- Fallback de ordenamiento/filtrado local ---------- */
function applyLocalSortFilter(
  items: Item[],
  opts: {
    term?: string;
    min?: number | null;
    max?: number | null;
    sort?: string | null;
  }
) {
  let out = [...items];

  // filtro por búsqueda (por si el backend no lo aplicó)
  if (opts.term) out = out.filter((p) => matchesItem(p, opts.term!));

  // filtro por precio
  if (opts.min != null) out = out.filter((p) => (priceFields(p).best ?? 0) >= opts.min!);
  if (opts.max != null) out = out.filter((p) => (priceFields(p).best ?? 0) <= opts.max!);

  // ordenamiento local
  switch (opts.sort) {
    case "price": // menor a mayor
      out.sort((a, b) => (priceFields(a).best ?? 0) - (priceFields(b).best ?? 0));
      break;
    case "-price": // mayor a menor
      out.sort((a, b) => (priceFields(b).best ?? 0) - (priceFields(a).best ?? 0));
      break;
    case "-sold": // más vendidos (fallback heurístico: productos con oferta primero)
      out.sort((a, b) => {
        const A = priceFields(a);
        const B = priceFields(b);
        if (A.hasOffer !== B.hasOffer) return A.hasOffer ? -1 : 1;
        return (B.best ?? 0) - (A.best ?? 0);
      });
      break;
    case "-id": // novedades (ya suelen venir así)
    default:
      break;
  }

  return out;
}

/* ---------- Fetch con soporte de búsqueda ---------- */
async function getData(params: URLSearchParams, queryTerm?: string) {
  try {
    // categorías
    const catsRes = await fetch(await abs("/api/public/categories"), { next: { revalidate: 60 } });
    const catsJson: any = catsRes.ok ? await catsRes.json().catch(() => ({})) : {};
    const cats: Cat[] = Array.isArray(catsJson?.items) ? catsJson.items : Array.isArray(catsJson) ? catsJson : [];

    // catálogo con estrategia de intentos
    const baseQS = new URLSearchParams(params);
    baseQS.delete("page");
    baseQS.delete("perPage");

    const page = Number(params.get("page") || "1");
    const perPage = Number(params.get("perPage") || "12");
    const sort = params.get("sort") || "-id";
    const minPrice = toNum(params.get("minPrice"));
    const maxPrice = toNum(params.get("maxPrice"));

    const tryStatus = ["all", "raw"];
    const tryKeys = ["query", "q", "search", "term"];

    for (const status of tryStatus) {
      for (const key of tryKeys) {
        const qs = new URLSearchParams(baseQS);
        qs.set("status", status);
        qs.set("page", String(page));
        qs.set("perPage", String(perPage));
        qs.set("sort", sort);
        if (queryTerm) qs.set(key, queryTerm);

        const url = await abs(`/api/public/catalogo?${qs.toString()}`);
        const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
        const json: any = res.ok ? await res.json().catch(() => ({})) : {};
        let items: Item[] = Array.isArray(json?.items) ? json.items : [];

        // Fallback de FILTRO/ORDEN en el front si el backend no lo aplicó
        items = applyLocalSortFilter(items, {
          term: queryTerm,
          min: minPrice,
          max: maxPrice,
          sort,
        });

        const total =
          queryTerm || minPrice != null || maxPrice != null
            ? items.length
            : typeof json?.filteredTotal === "number"
            ? json.filteredTotal
            : typeof json?.total === "number"
            ? json.total
            : items.length;

        if (items.length || status === "raw") {
          return { cats, items, page, perPage, total, sort, minPrice, maxPrice };
        }
      }
    }

    return { cats, items: [] as Item[], page, perPage, total: 0, sort, minPrice, maxPrice };
  } catch {
    return {
      cats: [] as Cat[],
      items: [] as Item[],
      page: 1,
      perPage: 12,
      total: 0,
      sort: "-id",
      minPrice: null,
      maxPrice: null,
    };
  }
}

/* ---------- “Más vendidos” (intento por API + fallback) ---------- */
async function getBestSellers(): Promise<Item[]> {
  try {
    const url = await abs("/api/public/catalogo?sort=-sold&perPage=8&status=all");
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
    const json: any = res.ok ? await res.json().catch(() => ({})) : {};
    const items: Item[] = Array.isArray(json?.items) ? json.items : [];
    if (items.length) return items;
  } catch {}
  return [];
}

/* ---------- Page ---------- */
export default async function Page({
  searchParams,
}: {
  // En este proyecto es Promise por el runtime
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = qp(sp);
  const term =
    (typeof sp.query === "string" ? sp.query : Array.isArray(sp.query) ? sp.query[0] : "")?.trim() || "";

  const { cats, items, page, perPage, total, sort, minPrice, maxPrice } = await getData(qs, term);

  // best sellers: intento por API; si viene vacío uso heurística sobre el set actual
  let bestSellers = await getBestSellers();
  if (!bestSellers.length) {
    bestSellers = applyLocalSortFilter(items, { sort: "-sold" }).slice(0, 8);
  }

  const catId = Number(qs.get("categoryId"));
  const subId = Number(qs.get("subcategoryId"));
  const cat = cats.find((c) => c.id === catId);
  const sub = cat?.subcats?.find((s) => s.id === subId);
  const baseTitle = (sub ? `${sub.name} · ` : "") + (cat ? `${cat.name} — ` : "") + "Catálogo";

  // ───────── Sucursales (igual que en landing) ─────────
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
      {/* Header completo como la landing */}
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Title / resultados */}
        <h1 className="text-2xl font-semibold">
          {term ? (
            <>
              Encontrados {total} resultado{total === 1 ? "" : "s"} para “{term}”
            </>
          ) : (
            baseTitle
          )}
        </h1>

        {/* Barra de búsqueda + orden + filtro por precio */}
        <form action="/catalogo" method="get" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] items-center">
          {/* Buscador */}
          <div className="flex items-center gap-2">
            <input
              name="query"
              defaultValue={term}
              placeholder="Buscar..."
              className="flex-1 rounded-full border px-4 py-2"
              aria-label="Buscar en el catálogo"
            />
            {/* preservamos filtros de categoría */}
            {catId ? <input type="hidden" name="categoryId" value={String(catId)} /> : null}
            {subId ? <input type="hidden" name="subcategoryId" value={String(subId)} /> : null}
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-600">
              Ordenar por:
            </label>
            <select id="sort" name="sort" defaultValue={sort || "-id"} className="rounded-full border px-3 py-2 text-sm">
              <option value="-sold">Más vendidos</option>
              <option value="-id">Novedades</option>
              <option value="price">Precio: menor a mayor</option>
              <option value="-price">Precio: mayor a menor</option>
            </select>
          </div>

          {/* Filtro de precio */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Precio:</label>
            <input
              type="number"
              name="minPrice"
              inputMode="numeric"
              placeholder="mín"
              defaultValue={minPrice ?? ""}
              className="w-24 rounded-full border px-3 py-2 text-sm"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              name="maxPrice"
              inputMode="numeric"
              placeholder="máx"
              defaultValue={maxPrice ?? ""}
              className="w-24 rounded-full border px-3 py-2 text-sm"
            />
          </div>

          <div className="justify-self-start md:justify-self-end">
            <button className="rounded-full bg-emerald-700 text-white px-4 py-2 text-sm">Aplicar</button>
          </div>
        </form>

        {/* Chips de categorías y subcategorías */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={term ? `/catalogo?query=${encodeURIComponent(term)}` : "/catalogo"} className="px-3 py-1 rounded-full border">
            Todos
          </Link>
          {cats.map((c) => {
            const url = new URLSearchParams();
            url.set("categoryId", String(c.id));
            if (term) url.set("query", term);
            if (sort) url.set("sort", sort);
            if (minPrice != null) url.set("minPrice", String(minPrice));
            if (maxPrice != null) url.set("maxPrice", String(maxPrice));
            return (
              <Link
                key={c.id}
                href={`/catalogo?${url.toString()}`}
                className={"px-3 py-1 rounded-full border " + (c.id === catId ? "bg-gray-200" : "")}
              >
                {c.name}
              </Link>
            );
          })}
          {!!cat && cat.subcats?.length ? (
            <span className="inline-flex items-center gap-2 ml-2">
              {cat.subcats.map((s) => {
                const url = new URLSearchParams();
                url.set("categoryId", String(cat.id));
                url.set("subcategoryId", String(s.id));
                if (term) url.set("query", term);
                if (sort) url.set("sort", sort);
                if (minPrice != null) url.set("minPrice", String(minPrice));
                if (maxPrice != null) url.set("maxPrice", String(maxPrice));
                return (
                  <Link
                    key={s.id}
                    href={`/catalogo?${url.toString()}`}
                    className={"px-3 py-1 rounded-full border " + (s.id === subId ? "bg-gray-200" : "")}
                  >
                    {s.name}
                  </Link>
                );
              })}
            </span>
          ) : null}
        </div>

        {/* Layout con sidebar (más vendidos) + grid principal */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Grid de resultados — primero en móvil, segundo en desktop */}
          <section className="order-1 lg:order-2 min-w-0">
            {/* ✅ unificado con ProductCard */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((raw) => {
                const p = normalizeProduct(raw);
                return (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    title={p.title}
                    image={p.image}
                    price={p.price ?? undefined}
                    originalPrice={p.originalPrice ?? undefined}
                    outOfStock={p.outOfStock}
                    brand={p.brand ?? undefined}
                    subtitle={p.subtitle ?? undefined}
                    variants={p.variants}
                  />
                );
              })}
              {!items.length && <p className="opacity-70 col-span-full">No hay resultados.</p>}
            </div>

            {/* Paginación (si no hay query y no filtramos en front, usamos la del backend) */}
            {!term && minPrice == null && maxPrice == null && total > perPage && (
              <nav className="mt-6 flex gap-2 items-center">
                {Array.from({ length: Math.ceil(total / Math.max(1, perPage)) }).map((_, i) => {
                  const n = i + 1;
                  const url = new URLSearchParams(qs);
                  url.set("page", String(n));
                  return (
                    <Link key={n} href={`/catalogo?${url.toString()}`} className={"border rounded px-3 py-1 " + (n === page ? "bg-gray-200" : "")}>
                      {n}
                    </Link>
                  );
                })}
              </nav>
            )}
          </section>

          {/* Sidebar: “Más vendidos” — segundo en móvil, primero en desktop.
              Si querés que SIEMPRE se vea (aun con búsqueda), quitá el condicional !term */}
          {!term && (
            <aside className="order-2 lg:order-1 lg:sticky lg:top-4 self-start">
              <h3 className="mb-3 font-semibold">Más vendidos</h3>

              <ul className="space-y-3">
                {bestSellers.map((raw) => {
                  const p = normalizeProduct(raw);
                  return (
                    <li key={p.id}>
                      <ProductCard
                        slug={p.slug}
                        title={p.title}
                        image={p.image}
                        price={p.price ?? undefined}
                        originalPrice={p.originalPrice ?? undefined}
                        outOfStock={p.outOfStock}
                        brand={p.brand ?? undefined}
                        subtitle={p.subtitle ?? undefined}
                        variant="row"
                        variants={p.variants}
                      />
                    </li>
                  );
                })}
                {!bestSellers.length && <li className="text-sm text-gray-500">Sin datos por ahora.</li>}
              </ul>
            </aside>
          )}
        </div>

        {/* Opiniones */}
        <div className="mt-10">
          <TestimonialsBadges />
        </div>

        {/* Ubicaciones */}
        <div className="mt-10">
          <MapHours locations={branches} />
        </div>
      </main>
    </>
  );
}
