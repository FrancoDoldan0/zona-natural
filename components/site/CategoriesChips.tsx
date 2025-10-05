// components/site/CategoriesChips.tsx
export const runtime = "edge";

import Link from "next/link";
import { headers } from "next/headers";

/* ──────────────────────────────────────────────────────────────────────────
   Tipos y helpers
   ────────────────────────────────────────────────────────────────────────── */

type CategoryRaw = {
  id?: string | number;
  name?: string;
  nombre?: string;
  title?: string;
  label?: string;
  slug?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  image?: string | null;   // por compatibilidad
  cover?: string | null;   // por compatibilidad
};

type ApiResponse =
  | CategoryRaw[]
  | { data: CategoryRaw[] }
  | { items: CategoryRaw[] }
  | unknown;

type Category = {
  id: string | number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  imageKey?: string | null;
};

const R2_BASE =
  (process.env.NEXT_PUBLIC_R2_BASE_URL || process.env.PUBLIC_R2_BASE_URL || "").replace(
    /\/+$/,
    ""
  );

/** URL absoluta válida en Edge/Cloudflare */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

/** Resuelve imagen priorizando imageKey (R2) y luego imageUrl */
function resolveImage(imageUrl?: string | null, imageKey?: string | null) {
  const key = (imageKey || "").trim().replace(/^\/+/, "");
  if (key && R2_BASE) return `${R2_BASE}/${key}`;
  const url = (imageUrl || "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  return url || ""; // relativo o vacío
}

function normalizeList(data: ApiResponse): CategoryRaw[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const anyData = data as Record<string, unknown>;
    if (Array.isArray(anyData.data)) return anyData.data as CategoryRaw[];
    if (Array.isArray(anyData.items)) return anyData.items as CategoryRaw[];
  }
  return [];
}

/** slugify sencillo si falta el slug */
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** PRNG determinístico */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Desordenado determinístico */
function shuffleBySeed<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Cambia cada 3 días (UTC) */
function getThreeDaySeed() {
  const now = Date.now();
  const day = Math.floor(now / 86400000); // días desde epoch
  const windowIdx = Math.floor(day / 3);
  return windowIdx;
}

/* ──────────────────────────────────────────────────────────────────────────
   Fetch categorías (público → fallback admin)
   ────────────────────────────────────────────────────────────────────────── */

async function fetchCategories(): Promise<Category[]> {
  try {
    // 1) público
    {
      const res = await fetch(await abs("/api/public/categories"), {
        next: { revalidate: 600 },
      });
      if (res.ok) {
        const json = (await res.json()) as ApiResponse;
        const list = normalizeList(json);
        if (list.length) return normalizeCategories(list);
      }
    }
  } catch {
    // ignore y probamos fallback
  }

  try {
    // 2) fallback admin
    const res = await fetch(await abs("/api/admin/categories?take=999"), {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const list: CategoryRaw[] = normalizeList(data);
    return normalizeCategories(list);
  } catch {
    return [];
  }
}

function normalizeCategories(list: CategoryRaw[]): Category[] {
  return list
    .map((c, idx) => {
      const name =
        c.name ?? c.nombre ?? c.title ?? c.label ?? `Categoría ${idx + 1}`;
      const slug = c.slug || slugify(String(name || ""));
      return {
        id: c.id ?? slug ?? idx,
        name: String(name),
        slug: String(slug),
        imageUrl:
          c.imageUrl ??
          c.image ??
          c.cover ??
          null,
        imageKey: c.imageKey ?? null,
      };
    })
    .filter((x) => !!x.slug && !!x.name);
}

/* ──────────────────────────────────────────────────────────────────────────
   Componente
   ────────────────────────────────────────────────────────────────────────── */

const MAX_SHOW = 8;

export default async function CategoriesChips() {
  const all = await fetchCategories();
  if (!all.length) return null;

  const withImg = all.filter((c) => resolveImage(c.imageUrl, c.imageKey));
  const noImg = all.filter((c) => !resolveImage(c.imageUrl, c.imageKey));

  // Orden determinístico para 3 días
  const seed = getThreeDaySeed();
  const ordered =
    withImg.length >= MAX_SHOW
      ? shuffleBySeed(withImg, seed)
      : shuffleBySeed(withImg, seed).concat(shuffleBySeed(noImg, seed));

  const pick = ordered.slice(0, Math.min(MAX_SHOW, ordered.length));
  if (!pick.length) return null;

  return (
    <div className="container py-6">
      <h2 className="text-lg font-semibold mb-3">Categorías destacadas</h2>

      {/* Carrusel horizontal centrado */}
      <div
        className="mx-auto flex gap-4 overflow-x-auto px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {pick.map((c) => {
          const img = resolveImage(c.imageUrl || undefined, c.imageKey || undefined);
          return (
            <Link
              key={String(c.id)}
              href={`/categoria/${c.slug}`}
              className="group shrink-0 w-[160px] rounded-xl border bg-white overflow-hidden shadow-soft hover:shadow-md transition"
            >
              <div className="relative h-24 w-full bg-gray-100">
                {img ? (
                  <img
                    src={img}
                    alt={c.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand/10 to-brand/5" />
                )}
              </div>
              <div className="p-2 text-center">
                <div className="text-sm font-medium line-clamp-2 group-hover:text-brand">
                  {c.name}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
