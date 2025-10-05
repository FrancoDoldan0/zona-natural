// components/site/FeaturedCategories.tsx
export const runtime = "edge";

import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

type Category = {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  icon?: string;
  cover?: string;
};

/** URL absoluta segura en Edge (Cloudflare) */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

/** Carga categorías desde el endpoint público */
async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(await abs("/api/public/categories"), {
      // no necesitamos milisegundos: refresco cache razonable
      next: { revalidate: 21600 }, // 6 h
    });
    if (!res.ok) return [];
    const data: any = await res.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** PRNG simple y determinístico */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle con seed */
function seededShuffle<T>(arr: T[], seed: number) {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Un seed que cambia cada 3 días (misma selección durante 3 días) */
function seed3DayWindow() {
  const MS_DAY = 86_400_000;
  const epochDays = Math.floor(Date.now() / MS_DAY);
  return Math.floor(epochDays / 3);
}

export default async function FeaturedCategories({
  count = 6,
  title = "Categorías destacadas",
}: {
  count?: number;
  title?: string;
}) {
  const categories = await fetchCategories();
  if (!categories.length) return null;

  const seed = seed3DayWindow();
  const picks = seededShuffle(categories, seed).slice(0, Math.min(count, categories.length));

  return (
    <section className="space-y-6">
      <h2 className="text-center text-2xl font-semibold">{title}</h2>

      {/* En móvil hace scroll; en desktop queda centrado */}
      <div className="flex gap-6 overflow-x-auto justify-center sm:flex-wrap px-1" style={{ scrollbarWidth: "none" }}>
        {picks.map((c) => {
          const href = c.slug
            ? `/catalogo?category=${encodeURIComponent(c.slug)}`
            : `/catalogo?categoryId=${c.id}`;
          const img = c.image ?? c.icon ?? c.cover ?? "";

          return (
            <Link key={c.id} href={href} className="flex flex-col items-center shrink-0">
              <div className="size-28 sm:size-32 rounded-full overflow-hidden ring-1 ring-black/5 bg-gray-100">
                {img ? (
                  // usamos <img> común para evitar restricciones externas
                  <img src={img} alt={c.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-ink-500">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-center max-w-[10rem]">{c.name}</p>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-ink-500">Se actualiza automáticamente cada 3 días.</p>
    </section>
  );
}
