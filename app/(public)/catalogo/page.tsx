// app/(public)/catalogo/page.tsx
export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { abs, noStoreFetch } from "@/lib/http";
import { toR2Url } from "@/lib/img";

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
  status?: "ACTIVE" | "AGOTADO" | "INACTIVE" | "DRAFT" | "ARCHIVED" | string;
  appliedOffer?: {
    id: number;
    title: string;
    discountType: "PERCENT" | "AMOUNT";
    discountVal: number;
  } | null;
  images?: Array<{ url?: string; key?: string; r2Key?: string; alt?: string | null }>;
  cover?: string | null;
  coverUrl?: string | null;
  image?: string | null;
};

const fmt = (n: number | null) =>
  n == null
    ? "-"
    : new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(n);

function qp(sp: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((one) => one != null && qs.append(k, one));
    else qs.set(k, v);
  }
  return qs;
}

async function getData(params: URLSearchParams) {
  try {
    const catsUrl = await abs("/api/public/categories");
    const listUrl1 = await abs(`/api/public/catalogo?status=all&${params.toString()}`);
    const [catsRes, listRes1] = await Promise.all([noStoreFetch(catsUrl), noStoreFetch(listUrl1)]);

    const catsJson: any = catsRes.ok ? await catsRes.json().catch(() => ({})) : {};
    let listJson: any = listRes1.ok ? await listRes1.json().catch(() => ({})) : {};

    // Fallback si está vacío
    if (!listJson?.items?.length) {
      const listUrl2 = await abs(`/api/public/catalogo?status=raw&${params.toString()}`);
      const listRes2 = await noStoreFetch(listUrl2);
      listJson = listRes2.ok ? await listRes2.json().catch(() => ({})) : {};
    }

    const cats: Cat[] = Array.isArray(catsJson?.items)
      ? catsJson.items
      : Array.isArray(catsJson)
      ? catsJson
      : [];

    return { cats, data: listJson || {} };
  } catch {
    return { cats: [] as Cat[], data: {} as any };
  }
}

export default async function Page({
  searchParams,
}: {
  // En Next 15 con PPR, searchParams es Promise<>
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = qp(sp);
  if (!qs.has("page")) qs.set("page", "1");
  if (!qs.has("perPage")) qs.set("perPage", "12");
  if (!qs.has("sort")) qs.set("sort", "-id");

  const { cats, data } = await getData(qs);

  const items: Item[] = Array.isArray(data?.items) ? (data.items as Item[]) : [];
  const page = Number(data?.page) || 1;
  const perPage = Number(data?.perPage) || 12;
  const total = Number(data?.total) || items.length;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  const catId = Number(qs.get("categoryId"));
  const subId = Number(qs.get("subcategoryId"));
  const cat = cats.find((c) => c.id === catId);
  const sub = cat?.subcats?.find((s) => s.id === subId);
  const title = (sub ? `${sub.name} · ` : "") + (cat ? `${cat.name} — ` : "") + "Catálogo";

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {/* Chips navegación */}
      <div className="flex flex-wrap gap-2">
        <Link href="/catalogo" className="px-3 py-1 rounded-full border">
          Todos
        </Link>
        {cats.map((c) => (
          <Link
            key={c.id}
            href={`/catalogo?categoryId=${c.id}`}
            className={
              "px-3 py-1 rounded-full border " + (c.id === catId ? "bg-gray-200" : "")
            }
          >
            {c.name}
          </Link>
        ))}
        {!!cat && cat.subcats?.length ? (
          <span className="inline-flex items-center gap-2 ml-2">
            {cat.subcats.map((s) => (
              <Link
                key={s.id}
                href={`/catalogo?categoryId=${cat.id}&subcategoryId=${s.id}`}
                className={
                  "px-3 py-1 rounded-full border " + (s.id === subId ? "bg-gray-200" : "")
                }
              >
                {s.name}
              </Link>
            ))}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => {
          const raw: any = p;
          const firstImg = raw.cover ?? raw.coverUrl ?? raw.image ?? raw.images?.[0];
          const src = toR2Url(firstImg);
          const alt =
            (typeof firstImg === "object" && firstImg?.alt) ||
            (typeof firstImg === "string" ? "" : "") ||
            p.name;

          const isOOS =
            typeof raw.status === "string" && raw.status.toUpperCase() === "AGOTADO";

          return (
            <Link
              key={p.id}
              href={`/producto/${p.slug}`}
              className="border rounded p-2 hover:shadow"
            >
              <div className="relative aspect-[4/3] bg-black/5 mb-2 overflow-hidden rounded">
                {src ? (
                  <img
                    src={src}
                    alt={alt || p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width:1024px) 22vw, (min-width:640px) 33vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
                {isOOS && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                    Agotado
                  </span>
                )}
              </div>

              <div className="font-medium">{p.name}</div>
              {p.priceFinal != null &&
              p.priceOriginal != null &&
              p.priceFinal < p.priceOriginal ? (
                <div className="text-sm">
                  <span className="text-green-600 font-semibold mr-2">
                    {fmt(p.priceFinal)}
                  </span>
                  <span className="line-through opacity-60">
                    {fmt(p.priceOriginal)}
                  </span>
                  {p.appliedOffer && (
                    <div className="text-xs opacity-80">Oferta: {p.appliedOffer.title}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm">{fmt(p.price)}</div>
              )}
            </Link>
          );
        })}
        {!items.length && (
          <p className="opacity-70 col-span-full">No hay resultados.</p>
        )}
      </div>

      {pages > 1 && (
        <nav className="flex gap-2 items-center">
          {Array.from({ length: pages }).map((_, i) => {
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
