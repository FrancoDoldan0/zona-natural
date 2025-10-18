// app/(public)/sobre-nosotros/page.tsx
// ⚠️ Quitamos runtime="edge" para permitir SSG/ISR
export const revalidate = 300; // 5 min

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import ProductCard from "@/components/ui/ProductCard";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";

/* ───────── helpers compartidos ───────── */
// Evitamos headers(); resolvemos absoluto solo si hay BASE_URL.
function abs(path: string) {
  if (path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}${path}` : path; // de lo contrario, usamos ruta relativa
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 300 }, // cachea en ISR
      ...init,
    });
    if (!res.ok) return null as any;
    return (await res.json()) as T;
  } catch {
    return null as any;
  }
}

/* Shuffle con seed diaria */
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function seededRand(seed: string) { let x = hash(seed) || 1; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function shuffleSeed<T>(arr: T[], seed: string) {
  const rand = seededRand(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i++) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────── tipos mínimos ───────── */
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
  image?: any;
  appliedOffer?: any | null;
  offer?: any | null;
};

/* ───────── data fetchers más livianos ───────── */
async function getOffersLight(limit = 8): Promise<Prod[]> {
  // Primero, endpoint de ofertas si existe
  let data = await safeJson<any>(abs("/api/public/offers?perPage=40"));
  let items: Prod[] =
    (Array.isArray((data as any)?.items) ? (data as any).items :
     Array.isArray(data) ? (data as any) : []) as Prod[];

  // Fallback suave: último catálogo y filtramos
  if (!items.length) {
    data = await safeJson<any>(abs("/api/public/catalogo?perPage=48&status=raw&sort=-id"));
    const list: Prod[] =
      (Array.isArray((data as any)?.items) ? (data as any).items :
       Array.isArray(data) ? (data as any) : []) as Prod[];
    items = list.filter((p) => {
      const priced =
        p.priceFinal != null &&
        p.priceOriginal != null &&
        Number(p.priceFinal) < Number(p.priceOriginal);
      const flagged = !!(p.appliedOffer || p.offer);
      return priced || flagged;
    });
  }
  return items.slice(0, limit);
}

async function getCatalogLight(limit = 12): Promise<Prod[]> {
  // Una sola llamada, ordenada por vendidos si tu backend lo soporta
  const data = await safeJson<any>(abs("/api/public/catalogo?status=raw&perPage=48&sort=-sold"));
  const items: any[] =
    (data as any)?.items ?? (data as any)?.data ?? (data as any)?.products ?? [];
  return (Array.isArray(items) ? (items as Prod[]) : []).slice(0, limit);
}

/* ───────── UI auxiliares ───────── */
function SidebarBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="sticky top-24 hidden lg:block lg:w-[280px] xl:w-[300px] self-start">
      <div className="rounded-xl ring-1 ring-emerald-100 bg-white overflow-hidden">
        <div className="px-3 py-2 text-sm font-semibold bg-emerald-50/50">{title}</div>
        <div className="p-2">{children}</div>
      </div>
    </aside>
  );
}

const PHONE_E164 = "59897531583";

/* ───────── sucursales ───────── */
function branchesData(): Branch[] {
  const hours: [string, string][] = [
    ["Lun–Vie", "09:00–19:00"],
    ["Sábado", "09:00–13:00"],
    ["Domingo", "Cerrado"],
  ];
  const enc = (s: string) => encodeURIComponent(s);
  return [
    {
      name: "Las Piedras",
      address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + enc("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + enc("Av. José Gervasio Artigas 600, Las Piedras, Canelones") + "&output=embed",
      hours,
    },
    {
      name: "Maroñas",
      address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + enc("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
      embedUrl: "https://www.google.com/maps?q=" + enc("Calle Dr. Capdehourat 2608, 11400 Montevideo") + "&output=embed",
      hours,
    },
    {
      name: "La Paz",
      address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + enc("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + enc("César Mayo Gutiérrez, 15900 La Paz, Canelones") + "&output=embed",
      hours,
    },
    {
      name: "Progreso",
      address: "Av. José Artigas, 15900 Progreso, Canelones",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + enc("Av. José Artigas, 15900 Progreso, Canelones"),
      embedUrl: "https://www.google.com/maps?q=" + enc("Av. José Artigas, 15900 Progreso, Canelones") + "&output=embed",
      hours,
    },
  ];
}

/* ───────── Reseñas demo ───────── */
const REVIEWS = [
  { name: "Natalia", time: "hace 2 semanas", text: "Me asesoraron súper bien y encontré todo para mis recetas. ¡Llegó rapidísimo!", stars: 5 },
  { name: "Andrés", time: "hace 1 mes", text: "Muy buena calidad y variedad. Pedí por la web y el envío fue puntual.", stars: 5 },
  { name: "Lucía",  time: "hace 3 meses", text: "Precios justos y atención de diez. Recomiendo la harina de almendras y los frutos secos.", stars: 4 },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-4 w-4 ${i < n ? "text-emerald-600" : "text-emerald-200"}`} fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.9l-5.2 2.6.99-5.78L1.58 7.62l5.82-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

/* ───────── Página ───────── */
export default async function SobreNosotrosPage() {
  // Menos sub-requests y todo cacheado con ISR
  const [offers, catalog] = await Promise.all([getOffersLight(6), getCatalogLight(18)]);
  const seed = new Date().toISOString().slice(0, 10);
  const offersDaily = shuffleSeed(offers, `${seed}:offers`);
  const bestDaily = shuffleSeed(catalog, `${seed}:best`);

  const toCardProps = (p: Prod) => ({
    slug: p.slug,
    title: p.name,
    image: p.cover ?? p.image ?? p.imageUrl ?? (p.images?.[0] ? { url: p.images[0].url } : undefined),
    price: p.priceFinal ?? p.price ?? p.priceOriginal ?? null,
    originalPrice:
      p.priceOriginal != null && p.priceFinal != null && p.priceFinal < p.priceOriginal
        ? p.priceOriginal
        : null,
    variant: "row" as const,
  });

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6">
          <SidebarBlock title="Más vendidos">
            {bestDaily.length ? (
              <div className="space-y-2">
                {bestDaily.slice(0, 6).map((p) => (
                  <ProductCard key={p.id} {...toCardProps(p)} />
                ))}
              </div>
            ) : (
              <div className="p-2 text-sm text-emerald-700/70">No hay productos para mostrar.</div>
            )}
          </SidebarBlock>

          <main className="flex-1 min-w-0">
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

            <div className="mt-10">
              <MapHours locations={branchesData()} />
            </div>

            <section className="mt-10 not-prose">
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

          <SidebarBlock title="Ofertas">
            {offersDaily.length ? (
              <div className="space-y-2">
                {offersDaily.slice(0, 6).map((p) => (
                  <ProductCard key={p.id} {...toCardProps(p)} />
                ))}
              </div>
            ) : (
              <div className="p-2 text-sm text-emerald-700/70">No hay productos para mostrar.</div>
            )}
          </SidebarBlock>
        </div>
      </div>

      <WhatsAppFloat />
    </>
  );
}
