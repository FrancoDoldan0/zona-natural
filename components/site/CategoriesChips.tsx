export const runtime = "edge";

import Link from "next/link";

type Category = {
  id?: string | number;
  name?: string;
  nombre?: string;
  title?: string;
  label?: string;
  slug?: string;
};

type ApiResponse =
  | Category[]
  | { data: Category[] }
  | { items: Category[] }
  | unknown;

function normalizeList(data: ApiResponse): Category[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const anyData = data as Record<string, unknown>;
    if (Array.isArray(anyData.data)) return anyData.data as Category[];
    if (Array.isArray(anyData.items)) return anyData.items as Category[];
  }
  return [];
}

async function getCategories(): Promise<Category[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const url = `${base}/api/public/categories`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = (await res.json()) as ApiResponse;
    return normalizeList(json);
  } catch {
    return [];
  }
}

export default async function CategoriesChips() {
  const cats = await getCategories();
  if (!cats.length) return null;

  return (
    <div className="container py-2 flex gap-2 overflow-x-auto">
      {cats.map((c, idx) => {
        const name =
          c.name ?? c.nombre ?? c.title ?? c.label ?? "Categoría";
        const slug =
          c.slug ??
          (typeof name === "string"
            ? name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, "-")
            : undefined);

        if (!slug) return null;

        return (
          <Link
            key={(c as any).id ?? slug ?? idx}
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
