export const runtime = "edge";

import Link from "next/link";

async function getCategories() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const url = `${base}/api/public/categories`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    // Acomodamos distintos posibles formatos: [], {data:[...]}, {items:[...]}
    const list = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default async function CategoriesChips() {
  const cats = await getCategories();
  if (!cats.length) return null;

  return (
    <div className="container py-2 flex gap-2 overflow-x-auto">
      {cats.map((c: any) => {
        const name =
          c.name ?? c.nombre ?? c.title ?? c.label ?? "Categoría";
        const slug =
          c.slug ??
          (typeof name === "string"
            ? name.toLowerCase().replace(/\s+/g, "-")
            : undefined);
        if (!slug) return null;
        return (
          <Link
            key={slug}
            href={`/categoria/${slug}`}
            className="px-3 py-1 rounded-full border text-sm hover:bg-brand/10 whitespace-nowrap"
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}
