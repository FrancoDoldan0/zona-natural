export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import ProductCard from "@/components/web/ProductCard";
import Link from "next/link";
import { headers } from "next/headers";

type Search = { q?: string; page?: string; perPage?: string; sort?: string };

function baseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host  = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getJSON(path: string) {
  const r = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
  return r.json();
}
async function getJSONSafe(path: string) {
  try { return await getJSON(path); } catch { return null; }
}

function clampInt(v: string|undefined, def: number, min=1, max=60){
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export default async function Page({ searchParams }: { searchParams: Search }) {
  const q = (searchParams.q || "").trim();
  const page = clampInt(searchParams.page, 1, 1, 9999);
  const perPage = clampInt(searchParams.perPage, 12, 1, 32);
  const sort = searchParams.sort || "-id";

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  params.set("sort", sort);

  const data = await getJSONSafe(`/api/public/catalogo?${params.toString()}`) || { ok:false, items:[], total:0 };
  const pages = Math.max(1, Math.ceil((data.total || 0) / perPage));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {!data.ok && (
        <div className="rounded border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
          No pudimos cargar el catálogo ahora. Probá nuevamente o cambiá los filtros.
        </div>
      )}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.isArray(data.items) && data.items.length
          ? data.items.map((p: any) => <ProductCard key={p.id} p={p} />)
          : <div className="opacity-60">Sin resultados.</div>}
      </div>

      {pages > 1 && (
        <nav className="flex items-center gap-2">
          <Link href={`/productos?${new URLSearchParams({ q, page: String(Math.max(1, page-1)), perPage: String(perPage), sort }).toString()}`}
                className={`border rounded px-3 ${page<=1 ? "pointer-events-none opacity-50" : ""}`}>‹</Link>
          <span className="text-sm">Página {page}/{pages}</span>
          <Link href={`/productos?${new URLSearchParams({ q, page: String(Math.min(pages, page+1)), perPage: String(perPage), sort }).toString()}`}
                className={`border rounded px-3 ${page>=pages ? "pointer-events-none opacity-50" : ""}`}>›</Link>
        </nav>
      )}
    </div>
  );
}