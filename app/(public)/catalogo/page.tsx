type Cat = { id:number; name:string; slug:string; subcats:{ id:number; name:string; slug:string }[] };
type Item = {
  id:number; name:string; slug:string; price:number|null; sku:string|null;
  description:string|null; category?: { name:string; slug:string }|null;
  coverUrl:string|null;
};

function qs(obj:Record<string,any>){
  const u = new URLSearchParams();
  for(const k in obj){ if(obj[k]!=null && obj[k]!=="") u.set(k,String(obj[k])); }
  const s = u.toString(); return s?`?${s}`:"";
}

async function fetchJSON<T>(url: string, revalidate=60): Promise<T>{
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/,"");
  const r = await fetch(base + url, { next:{ revalidate } });
  return r.json();
}

export default async function Page({ searchParams }:{ searchParams:Record<string,string|undefined> }){
  const q = searchParams.q ?? "";
  const category = searchParams.category ?? "";
  const subcategory = searchParams.subcategory ?? "";
  const order = searchParams.order ?? "newest";
  const page = Number(searchParams.page ?? "1");

  const [catsRes, listRes] = await Promise.all([
    fetchJSON<{ok:boolean; items:Cat[]}>("/api/public/categories"),
    fetchJSON<{ok:boolean; items:Item[]; total:number; page:number; perPage:number}>(`/api/public/catalogo${qs({ q, category, subcategory, order, page })}`, 0)
  ]);
  const cats = (catsRes.items ?? []);
  const list = (listRes.items ?? []);
  const total = listRes.total ?? 0;
  const perPage = listRes.perPage ?? 12;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Catálogo</h1>

      {/* Filtros mínimos */}
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar…" className="border rounded p-2" />
        <select name="order" defaultValue={order} className="border rounded p-2">
          <option value="newest">Novedades</option>
          <option value="price_asc">Precio ↑</option>
          <option value="price_desc">Precio ↓</option>
        </select>
        <select name="category" defaultValue={category} className="border rounded p-2">
          <option value="">Todas las categorías</option>
          {cats.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="subcategory" defaultValue={subcategory} className="border rounded p-2">
          <option value="">Todas las subcategorías</option>
          {cats.flatMap(c=>c.subcats||[]).map(s=><option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
        <button className="border rounded px-3">Filtrar</button>
      </form>

      {/* Grid de productos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map(p=>(
          <a key={p.id} href={`/producto/${p.slug}`} className="border rounded overflow-hidden hover:shadow">
            <div className="bg-black/5 aspect-[4/3] flex items-center justify-center">
              {p.coverUrl
                ? <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover" />
                : <span className="text-sm opacity-60">Sin imagen</span>}
            </div>
            <div className="p-2">
              <div className="font-medium truncate">{p.name}</div>
              {p.price!=null && <div className="text-sm opacity-80">${p.price}</div>}
            </div>
          </a>
        ))}
      </div>

      {/* Paginación básica */}
      {total>perPage && (
        <nav className="flex gap-2">
          {Array.from({length: Math.ceil(total/perPage)}, (_,_i)=>_i+1).map(n=>{
            const href = qs({ q, category, subcategory, order, page:n });
            return <a key={n} href={`/catalogo${href}`} className={"border rounded px-3 "+(n===page?"bg-gray-200":"")}>{n}</a>;
          })}
        </nav>
      )}
    </main>
  );
}