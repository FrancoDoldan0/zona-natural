// app/(public)/catalogo/page.tsx
export const runtime = "edge";
export const revalidate = 30;

import Link from "next/link";
import { headers } from "next/headers";

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

const fmt = (n: number | null) =>
  n == null ? "-" : new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(n);

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

const R2_BASE = (process.env.PUBLIC_R2_BASE_URL || "").replace(/\/+$/, "");
function toR2Url(input: unknown): string {
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object") {
    const o = input as any;
    raw = (o.url ?? o.r2Key ?? o.key ?? "").toString();
  }
  raw = (raw || "").trim();
  if (!raw) return "/placeholder.png";
  if (/^https?:\/\//i.test(raw)) return raw;
  const key = raw.replace(/^\/+/, "");
  return R2_BASE ? `${R2_BASE}/${key}` : `/${key}`;
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

function matchesItem(p: Item, term: string) {
  const t = norm(term);
  return norm(p.name).includes(t) || norm(p.slug || "").includes(t);
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

    const tryStatus = ["all", "raw"];
    const tryKeys = ["query", "q", "search", "term"];

    for (const status of tryStatus) {
      for (const key of tryKeys) {
        const qs = new URLSearchParams(baseQS);
        qs.set("status", status);
        qs.set("page", String(page));
        qs.set("perPage", String(perPage));
        qs.set("sort", params.get("sort") || "-id");
        if (queryTerm) qs.set(key, queryTerm);

        const url = await abs(`/api/public/catalogo?${qs.toString()}`);
        const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
        const json: any = res.ok ? await res.json().catch(() => ({})) : {};
        let items: Item[] = Array.isArray(json?.items) ? json.items : [];

        // Fallback de FILTRO en el front si el backend no filtró
        if (queryTerm) {
          items = items.filter((p) => matchesItem(p, queryTerm));
        }

        const total =
          queryTerm ? items.length :
          typeof json?.filteredTotal === "number"
            ? json.filteredTotal
            : typeof json?.total === "number"
            ? json.total
            : items.length;

        if (items.length || status === "raw") {
          return { cats, items, page, perPage, total };
        }
      }
    }

    return { cats, items: [] as Item[], page, perPage, total: 0 };
  } catch {
    return { cats: [] as Cat[], items: [] as Item[], page: 1, perPage: 12, total: 0 };
  }
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

  const { cats, items, page, perPage, total } = await getData(qs, term);

  const catId = Number(qs.get("categoryId"));
  const subId = Number(qs.get("subcategoryId"));
  const cat = cats.find((c) => c.id === catId);
  const sub = cat?.subcats?.find((s) => s.id === subId);
  const baseTitle = (sub ? `${sub.name} · ` : "") + (cat ? `${cat.name} — ` : "") + "Catálogo";

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        {term ? (
          <>
            Encontrados {total} resultado{total === 1 ? "" : "s"} para “{term}”
          </>
        ) : (
          baseTitle
        )}
      </h1>

      {/* Buscador interno (GET) */}
      <form action="/catalogo" method="get" className="flex items-center gap-2 max-w-lg">
        <input
          name="query"
          defaultValue={term}
          placeholder="Buscar..."
          className="flex-1 rounded-full border px-4 py-2"
          aria-label="Buscar en el catálogo"
        />
        {/* conservamos filtros */}
        {catId ? <input type="hidden" name="categoryId" value={String(catId)} /> : null}
        {subId ? <input type="hidden" name="subcategoryId" value={String(subId)} /> : null}
        <button className="rounded-full bg-emerald-700 text-white px-4 py-2 text-sm">Buscar</button>
      </form>

      {/* Chips de navegación (preservan query si existe) */}
      <div className="flex flex-wrap gap-2">
        <Link href={term ? `/catalogo?query=${encodeURIComponent(term)}` : "/catalogo"} className="px-3 py-1 rounded-full border">
          Todos
        </Link>
        {cats.map((c) => {
          const url = new URLSearchParams();
          url.set("categoryId", String(c.id));
          if (term) url.set("query", term);
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

      {/* Grid de resultados */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const raw: any = p;
          const firstImg = raw.cover ?? raw.coverUrl ?? raw.image ?? raw.images?.[0];
          const src = toR2Url(firstImg);
          const alt =
            (typeof firstImg === "object" && firstImg?.alt) ||
            (typeof firstImg === "string" ? "" : "") ||
            p.name;
          const isOOS = typeof raw.status === "string" && raw.status.toUpperCase() === "AGOTADO";

          return (
            <Link key={p.id} href={`/producto/${p.slug}`} className="border rounded p-2 hover:shadow">
              <div className="relative aspect-[4/3] bg-black/5 mb-2 overflow-hidden rounded">
                <img
                  src={src}
                  alt={alt || p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw"
                />
                {isOOS && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                    Agotado
                  </span>
                )}
              </div>

              <div className="font-medium">{p.name}</div>
              {p.priceFinal != null && p.priceOriginal != null && p.priceFinal < p.priceOriginal ? (
                <div className="text-sm">
                  <span className="text-green-600 font-semibold mr-2">{fmt(p.priceFinal)}</span>
                  <span className="line-through opacity-60">{fmt(p.priceOriginal)}</span>
                </div>
              ) : (
                <div className="text-sm">{fmt(p.price)}</div>
              )}
            </Link>
          );
        })}
        {!items.length && <p className="opacity-70 col-span-full">No hay resultados.</p>}
      </div>

      {/* Paginación (si no hay query usamos la del backend; con query filtramos en front y no paginamos) */}
      {!term && total > perPage && (
        <nav className="flex gap-2 items-center">
          {Array.from({ length: Math.ceil(total / Math.max(1, perPage)) }).map((_, i) => {
            const n = i + 1;
            const url = new URLSearchParams(qs);
            url.set("page", String(n));
            return (
              <Link
                key={n}
                href={`/catalogo?${url.toString()}`}
                className={"border rounded px-3 " + (n === page ? "bg-gray-200" : "")}
              >
                {n}
              </Link>
            );
          })}
        </nav>
      )}
    </main>
  );
}
