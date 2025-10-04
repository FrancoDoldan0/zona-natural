type Category = { id: number; name: string; slug: string };
type CategoriesResp = { items?: Category[] };

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

async function fetchCategories(): Promise<Category[]> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/public/categories`, { next: { revalidate: 300 } });
    const data = (await res.json()) as CategoriesResp;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export default async function Header() {
  const categories = await fetchCategories();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="container h-16 flex items-center gap-4">
        <a href="/landing" className="font-semibold text-lg text-ink-900">
          Zona Natural
        </a>

        <form action="/productos" className="flex-1 max-w-xl">
          <input
            name="q"
            placeholder="Buscar productos…"
            className="w-full h-10 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </form>

        <nav className="hidden md:flex items-center gap-4">
          <a href="/productos" className="hover:text-brand">Productos</a>
          <a href="/ofertas" className="hover:text-brand">Ofertas</a>
          <a href="/catalogo" className="hover:text-brand">Catálogo</a>
        </nav>
      </div>

      <div className="border-t">
        <div className="container py-2 flex gap-2 overflow-x-auto">
          {(categories.length ? categories : [
            { id: 1, name: "Almacén", slug: "almacen" },
            { id: 2, name: "Frutos secos", slug: "frutos-secos" },
          ]).map((c) => (
            <a
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="px-3 py-1 rounded-full border text-sm hover:bg-brand/10 whitespace-nowrap"
            >
              {c.name}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
