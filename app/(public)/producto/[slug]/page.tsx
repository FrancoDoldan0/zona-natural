// app/(public)/producto/[slug]/page.tsx
export const runtime = "edge";
export const revalidate = 60;

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

// Secciones adicionales
import RecipesPopular from "@/components/landing/RecipesPopular";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import Sustainability from "@/components/landing/Sustainability";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

import { fmtPrice } from "@/lib/price";
import { normalizeProduct, toR2Url } from "@/lib/product";
import ProductCard from "@/components/ui/ProductCard";
import AddToCart from "@/components/cart/AddToCart";

/* ───────── helpers comunes ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {}
  return path;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 }, ...init });
    if (!res.ok) return null as any;
    return (await res.json()) as T;
  } catch {
    return null as any;
  }
}

/* ───────── fetch de producto por slug ───────── */
type RawItem = Record<string, any>;

async function fetchOneBySlug(slug: string): Promise<RawItem | null> {
  for (const pth of [`/api/public/producto/${slug}`, `/api/public/product/${slug}`]) {
    const data = await safeJson<any>(await abs(pth));
    if (data && typeof data === "object") {
      const raw = (data.item ?? data.product ?? data) as RawItem;
      if (raw && (raw.slug === slug || raw.id)) return raw;
    }
  }
  const keys = ["slug", "query", "q", "search", "term", "name"];
  const statuses = ["all", "raw"];
  for (const status of statuses) {
    for (const key of keys) {
      const qs = new URLSearchParams();
      qs.set("perPage", "48");
      qs.set("status", status);
      qs.set(key, slug);
      const data = await safeJson<any>(await abs(`/api/public/catalogo?${qs}`));
      const list: RawItem[] =
        (data?.items as RawItem[]) ??
        (data?.data as RawItem[]) ??
        (data?.products as RawItem[]) ??
        (data?.results as RawItem[]) ??
        [];
      if (Array.isArray(list) && list.length) {
        const exact = list.find((x) => (x.slug ?? "").toString() === slug);
        return exact ?? list[0];
      }
    }
  }
  return null;
}

/* ───────── metadata ───────── */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await fetchOneBySlug(slug);
  const p = raw ? normalizeProduct(raw) : null;
  return {
    title: p ? `${p.title} — Zona Natural` : "Producto — Zona Natural",
    description: p?.subtitle || "Producto natural y saludable.",
  };
}

/* ───────── utilidades ───────── */
function getSku(raw: RawItem, selVariant?: any): string | null {
  if (selVariant?.sku) return String(selVariant.sku);
  const v = raw.sku ?? raw.SKU ?? raw.codigo ?? raw.code ?? raw.productCode ?? null;
  return v ? String(v) : null;
}
function getCategories(raw: RawItem): string[] {
  const one =
    raw.category?.name ?? raw.categoria?.name ?? raw.categoryName ?? raw.categoria ?? null;
  const many: any[] = raw.categories ?? raw.categorias ?? raw.cats ?? raw.tags ?? [];
  const names = [
    ...(one ? [one] : []),
    ...many.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
  ];
  return Array.from(new Set(names));
}
function getDescription(raw: RawItem): { html?: string; text?: string } {
  const desc =
    raw.description ?? raw.desc ?? raw.bodyHtml ?? raw.body ?? raw.content ?? raw.detalle ?? raw.details ?? null;
  if (!desc) return {};
  const s = String(desc).trim();
  if (/<[a-z][\s\S]*>/i.test(s)) return { html: s };
  return { text: s };
}
function getFirstCategoryId(raw: RawItem): number | null {
  const id =
    raw.categoryId ?? raw.categoriaId ?? raw.category?.id ?? raw.categoria?.id ??
    (Array.isArray(raw.categories) && raw.categories[0]?.id) ??
    (Array.isArray(raw.categorias) && raw.categorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}
function getFirstSubcategoryId(raw: RawItem): number | null {
  const id =
    raw.subcategoryId ?? raw.subcategoriaId ?? raw.subcategory?.id ?? raw.subcategoria?.id ??
    (Array.isArray(raw.subcategories) && raw.subcategories[0]?.id) ??
    (Array.isArray(raw.subcategorias) && raw.subcategorias[0]?.id) ??
    null;
  return id != null ? Number(id) : null;
}

/* ───────── Página ───────── */
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const raw = await fetchOneBySlug(slug);
  if (!raw) return notFound();

  const p = normalizeProduct(raw);
  const img = toR2Url(p.image);
  const productUrl = await abs(`/producto/${p.slug}`);

  /* ───────── Sucursales ───────── */
  const hours: [string, string][] = [
    ["Lun–Vie", "09:00–19:00"],
    ["Sábado", "09:00–13:00"],
    ["Domingo", "Cerrado"],
  ];

  const encode = (s: string) => encodeURIComponent(s);

  const branches: Branch[] = [
    {
      name: "Las Piedras",
      address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Gervasio Artigas 600, Las Piedras, Canelones") +
        "&output=embed",
      hours,
    },
    {
      name: "La Paz",
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("César Mayo Gutiérrez, 15900 La Paz, Canelones") +
        "&output=embed",
      hours,
    },
  ];

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mt-12">
          <MapHours locations={branches} />
        </div>
      </main>
    </>
  );
}
