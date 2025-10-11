// app/(public)/recetas/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

import BestSellersGrid from "@/components/landing/BestSellersGrid";
import TestimonialsBadges from "@/components/landing/TestimonialsBadges";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import { recipes, FALLBACK_IMG } from "./recipes";

/* Helpers (igual que en la landing) */
async function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}${path}`;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 }, ...init });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* Tipos y fetch del catálogo para “Más vendidos” */
type Prod = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url?: string; alt?: string | null }[];
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: any;
  image?: any;
  status?: string;
};

async function getCatalog(perPage = 48): Promise<Prod[]> {
  const statuses = ["all", "raw"];
  for (const status of statuses) {
    const data = await safeJson<any>(
      await abs(
        `/api/public/catalogo?status=${status}&perPage=${perPage}&sort=-id&_ts=${Date.now()}`
      ),
      { cache: "no-store", next: { revalidate: 0 } }
    );
    const items: any[] =
      data?.items ?? data?.data ?? data?.products ?? data?.results ?? [];
    if (Array.isArray(items) && items.length) return items as Prod[];
  }
  return [];
}

export default async function RecipesIndex() {
  // Productos para “Más vendidos”
  const catalog = await getCatalog(48);

  // Sucursales (mismas que en la landing)
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
      name: "Maroñas",
      address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Calle Dr. Capdehourat 2608, 11400 Montevideo") +
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
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl:
        "https://www.google.com/maps?q=" +
        encode("Av. José Artigas, 15900 Progreso, Canelones") +
        "&output=embed",
      hours,
    },
  ];

  return (
    <>
      {/* Header igual a la landing */}
      <InfoBar />
      <Header />
      <MainNav />

      {/* Listado de recetas */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/landing" className="text-sm text-emerald-800 hover:underline">
            ← Volver al inicio
          </Link>

          <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Recetas</h1>

          <div className="mt-6 grid gap-4 md:gap-6 md:grid-cols-3">
            {recipes.map((r) => (
              <Link
                key={r.slug}
                href={`/recetas/${r.slug}`}
                className="block rounded-2xl ring-1 ring-emerald-100 bg-white overflow-hidden hover:shadow transition-shadow"
              >
                <div className="relative bg-emerald-50 aspect-[16/10]">
                  <img
                    src={r.img || FALLBACK_IMG}
                    alt={r.heroAlt || r.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{r.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
                  {r.timeMin ? (
                    <p className="mt-1 text-xs text-gray-500">⏱ {r.timeMin} min</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Más vendidos */}
      <BestSellersGrid items={catalog} />

      {/* Opiniones + badges */}
      <TestimonialsBadges />

      {/* Mapa + horarios */}
      <MapHours locations={branches} />
    </>
  );
}
