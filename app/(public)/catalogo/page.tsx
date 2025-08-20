import Link from "next/link";
import { headers } from "next/headers";

type Cat = { id:number; name:string; slug:string; subcats:{ id:number; name:string; slug:string }[] };
type Item = {
  id:number; name:string; slug:string; price:number|null; sku:string|null; status:string;
  category?: { id:number; name:string; slug:string } | null;
  subcategory?: { id:number; name:string; slug:string } | null;
};
type CatalogResp = { ok:boolean; meta:{ page:number; perPage:number; total:number; pages:number }; items:Item[] };

function originFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k,v])=>{
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function CatalogPage({
  searchParams,
}: { searchParams: { q?:string; category?:string; subcategory?:string; min?:string; max?:string; order?:string; page?:string } }) {

  const o = originFromHeaders();
  const page = Number(searchParams.page ?? "1") || 1;
  const perPage = 12;

  const [catsRes, listRes] = await Promise.all([
    fetch(`${o}/api/public/categories`, { next: { revalidate: 60 } }),
    fetch(`${o}/api/public/catalogo${qs({
      q: searchParams.q,
      category: searchParams.category,
      subcategory: searchParams.subcategory,
      min: searchParams.min,
      max: searchParams.max,
      order: searchParams.order ?? "newest",
      page,
      perPage
    })}`, { cache: "no-store" }),
  ]);

  const catsJson = await catsRes.json();
  const cats: Cat[] = catsJson.items ?? [];

  const listJson: CatalogResp = await listRes.json();
  const items = listJson.items ?? [];
  const meta = listJson.meta ?? { page, perPage, total: 0, pages: 1 };

  // Para selects
  const allSubcats = cats.flatMap(c => c.subcats.map(s => ({ ...s, parent: c.slug })));

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catálogo</h1>

      <form className="grid gap-2 md:grid-cols-6 border rounded p-4">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar…" className="border rounded p-2 md:col-span-2" />
        <select name="category" defaultValue={searchParams.category ?? ""} className="border rounded p-2">
          <option value="">Todas las categorías</option>
          {cats.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="subcategory" defaultValue={searchParams.subcategory ?? ""} className="border rounded p-2">
          <option value="">Todas las subcategorías</option>
          {allSubcats.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <select name="order" defaultValue={searchParams.order ?? "newest"} className="border rounded p-2">
          <option value="newest">Más nuevos</option>
          <option value="price_asc">Precio ↑</option>
          <option value="price_desc">Precio ↓</option>
        </select>
        <button className="border rounded px-4" type="submit">Filtrar</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(p=>(
          <Link key={p.id} href={`/producto/${p.slug}`} className="border rounded p-3 block">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm opacity-80">
              {p.category?.name || "-"} {p.subcategory ? `· ${p.subcategory.name}` : ""}
            </div>
            <div className="mt-1">{p.price != null ? `$ ${p.price}` : "-"}</div>
          </Link>
        ))}
        {!items.length && <div className="opacity-70">Sin resultados.</div>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm opacity-80">Página {meta.page} / {meta.pages}</span>
        <div className="ml-auto flex gap-2">
          {meta.page > 1 && (
            <Link
              className="border rounded px-3 py-1"
              href={qs({ ...searchParams, page: meta.page - 1 })}
            >‹ Anterior</Link>
          )}
          {meta.page < meta.pages && (
            <Link
              className="border rounded px-3 py-1"
              href={qs({ ...searchParams, page: meta.page + 1 })}
            >Siguiente ›</Link>
          )}
        </div>
      </div>
    </main>
  );
}