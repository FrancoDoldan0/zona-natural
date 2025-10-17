// app/(public)/sobre-nosotros/page.tsx
export const runtime = "edge";
export const revalidate = 60; // igual que la landing principal

import type { Metadata } from "next";
import { headers as nextHeaders } from "next/headers";

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import OffersCarousel from "@/components/landing/OffersCarousel";
import BestSellersGrid from "@/components/landing/BestSellersGrid";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";

/* ───────── helpers comunes (copiados de la landing) ───────── */
async function abs(path: string) {
  if (path.startsWith("http")) return path;

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;

  try {
    const h = await nextHeaders();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (host) return `${proto}://${host}${path}`;
  } catch {
    // sin headers(): devolvemos ruta relativa
  }
  return path;
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

/* ───────── tipos mínimos para los data fetchers ───────── */
type Prod = {
  id: number;
  name: string;
  slug: string;
  price?: number | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  images?: { url: string; alt?: string | null }[];
  imageUrl?: string | null;
  cover?: any;
  coverUrl?: any;
  image?: any;
  status?: string;
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── data fetchers (idénticos a la landing) ───────── */
async function getOffersRaw(): Promise<Prod[]> {
  const data = await safeJson<any>(
    await abs("/api/public/catalogo?perPage=48&sort=-id"),
    { cache: "no-store", next: { revalidate: 0 } }
  );
  const items: Prod[] = ((data as any)?.items ?? []) as Prod[];
  return items.filter((p) => {
    const priced =
      p.priceFinal != null &&
      p.priceOriginal != null &&
      Number(p.priceFinal) < Number(p.priceOriginal);
    const flagged = !!(p.appliedOffer || p.offer);
    return priced || flagged;
  });
}

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
      (data as any)?.items ??
      (data as any)?.data ??
      (data as any)?.products ??
      (data as any)?.results ??
      [];
    if (Array.isArray(items) && items.length) return items as Prod[];
  }
  return [];
}

/* ───────── metadata ───────── */
export const metadata: Metadata = {
  title: "Sobre nosotros – Zona Natural",
  description:
    "Conocé la historia de Zona Natural: productos naturales, saludables y ricos para tu día a día.",
};

/* ───────── texto + reseñas (igual que tu versión anterior) ───────── */
const PHONE_E164 = "59897531583";
const REVIEWS = [
  { name: "Natalia", time: "hace 2 semanas", text: "Me asesoraron súper bien y encontré todo para mis recetas. ¡Llegó rapidísimo!", stars: 5 },
  { name: "Andrés", time: "hace 1 mes", text: "Muy buena calidad y variedad. Pedí por la web y el envío fue puntual.", stars: 5 },
  { name: "Lucía",  time: "hace 3 meses", text: "Precios justos y atención de diez. Recomiendo la harina de almendras y los frutos secos.", stars: 4 },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < n ? "text-emerald-600" : "text-emerald-200"}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.9l-5.2 2.6.99-5.78L1.58 7.62l5.82-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

/* ───────── sucursales (copiadas de la landing) ───────── */
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

/* ───────── página ───────── */
export default async function SobreNosotrosPage() {
  // Traemos los mismos datasets que usa la landing
  const [offersAll, catalog] = await Promise.all([
    getOffersRaw(),
    getCatalog(48),
  ]);

  // Semilla diaria para que ofrezca variedad como la home
  const seed = new Date().toISOString().slice(0, 10);
  const shuffleSeed = <T,>(arr: T[], seedStr: string) => {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) | 0;
    h = Math.abs(h) || 1;
    const rand = () => (h = (h * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i++) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const OFFERS_COUNT = 3;
  const offersDaily = shuffleSeed(offersAll, `${seed}:offers`).slice(0, OFFERS_COUNT);

  return (
    <>
      {/* Header con buscador (idéntico a otras landings) */}
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Intro */}
        <section className="prose prose-emerald">
          <h1>Sobre nosotros</h1>
          <p>
            En <strong>Zona Natural</strong> creemos que lo simple es lo que mejor hace bien.
            Trabajamos con marcas y productores que comparten nuestros valores para acercarte
            productos naturales, saludables y ricos.
          </p>

          <h2>Nuestra historia</h2>
          <p>
            Nacimos con la idea de facilitar el acceso a alimentos reales y opciones más
            conscientes para todos los días. Empezamos con un catálogo chico y hoy seguimos
            creciendo gracias a tu confianza, manteniendo el foco en la calidad y la atención.
          </p>

          <h2>Qué nos mueve</h2>
          <ul>
            <li>Selección cuidada de productos y precios justos.</li>
            <li>Servicio cercano y envíos ágiles en Montevideo.</li>
            <li>Comunicación clara de ingredientes y orígenes.</li>
          </ul>
        </section>

        {/* Ofertas (misma lógica de la home) */}
        <div className="mt-8">
          <OffersCarousel items={offersDaily} />
        </div>

        {/* Más vendidos (misma heurística de la home) */}
        <div className="mt-8">
          <BestSellersGrid items={catalog} />
        </div>

        {/* Mapa + horarios con múltiples sucursales (igual que la home) */}
        <div className="mt-10">
          <MapHours locations={branches} />
        </div>

        {/* Opiniones */}
        <section className="mt-12 not-prose">
          <h2 className="text-2xl font-semibold">Opiniones de clientes</h2>
          <p className="mt-1 text-sm text-gray-600">Gracias por la confianza de cada día 💚</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {REVIEWS.map((r, i) => (
              <article key={i} className="rounded-xl ring-1 ring-emerald-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.name}</div>
                  <Stars n={r.stars} />
                </div>
                <p className="mt-2 text-sm text-gray-700">{r.text}</p>
                <div className="mt-3 text-xs text-gray-500">{r.time}</div>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <a
              href={`https://wa.me/${PHONE_E164}?text=${encodeURIComponent("¡Hola! Quiero dejarles mi opinión 😊")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800 ring-1 ring-emerald-800/30"
            >
              Escribir una reseña por WhatsApp
            </a>
          </div>
        </section>
      </main>

      {/* Bubble flotante */}
      <WhatsAppFloat />
    </>
  );
}
