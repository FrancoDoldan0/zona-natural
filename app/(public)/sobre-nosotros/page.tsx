// app/(public)/sobre-nosotros/page.tsx
export const runtime = "edge";

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import MapHours, { type Branch } from "@/components/landing/MapHours";
import { SideBestSellers } from "@/components/sobre-nosotros/SideRails";

/* ------------------------------------------------------------------ */
/* Sucursales: igual que en la landing                                */
/* ------------------------------------------------------------------ */

const hours: [string, string][] = [
  ["Lun–Vie", "09:00–19:00"],
  ["Sábado", "09:00–13:00"],
  ["Domingo", "Cerrado"],
];

const enc = (s: string) => encodeURIComponent(s);

const branches: Branch[] = [
  {
    name: "Las Piedras",
    address: "Av. José Gervasio Artigas 600, Las Piedras, Canelones",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      enc("Av. José Gervasio Artigas 600, Las Piedras, Canelones"),
    embedUrl:
      "https://www.google.com/maps?q=" +
      enc("Av. José Gervasio Artigas 600, Las Piedras, Canelones") +
      "&output=embed",
    hours,
  },
  {
    name: "Maroñas",
    address: "Calle Dr. Capdehourat 2608, 11400 Montevideo",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      enc("Calle Dr. Capdehourat 2608, 11400 Montevideo"),
    embedUrl:
      "https://www.google.com/maps?q=" +
      enc("Calle Dr. Capdehourat 2608, 11400 Montevideo") +
      "&output=embed",
    hours,
  },
  {
    name: "La Paz",
    address: "César Mayo Gutiérrez, 15900 La Paz, Canelones",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      enc("César Mayo Gutiérrez, 15900 La Paz, Canelones"),
    embedUrl:
      "https://www.google.com/maps?q=" +
      enc("César Mayo Gutiérrez, 15900 La Paz, Canelones") +
      "&output=embed",
    hours,
  },
  {
    name: "Progreso",
    address: "Av. José Artigas, 15900 Progreso, Canelones",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      enc("Av. José Artigas, 15900 Progreso, Canelones"),
    embedUrl:
      "https://www.google.com/maps?q=" +
      enc("Av. José Artigas, 15900 Progreso, Canelones") +
      "&output=embed",
    hours,
  },
];

/* ------------------------------------------------------------------ */
/* Ofertas sidebar: se cargan en el servidor desde /api/public/sidebar-offers */
/* ------------------------------------------------------------------ */

type SidebarOffer = {
  id: string | number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  price?: number | null;
  priceOriginal?: number | null;
};

async function loadSidebarOffers(): Promise<SidebarOffer[]> {
  try {
    const res = await fetch("/api/public/sidebar-offers?take=5", {
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data: any = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data?.items) ? data.items : [];

    return list
      .map((r: any, idx: number): SidebarOffer => ({
        id: r.id ?? idx,
        name: r.name ?? `Producto ${idx + 1}`,
        slug: r.slug ?? "",
        imageUrl: r.imageUrl ?? null,
        price:
          typeof r.price === "number"
            ? r.price
            : r.price != null
            ? Number(r.price)
            : null,
        priceOriginal:
          typeof r.priceOriginal === "number"
            ? r.priceOriginal
            : r.priceOriginal != null
            ? Number(r.priceOriginal)
            : null,
      }))
      .filter((o) => o.name && o.slug);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

export default async function SobreNosotrosPage() {
  const offers = await loadSidebarOffers();

  return (
    <>
      <InfoBar />
      <Header />
      <MainNav />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* layout de 3 columnas: laterales + contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr,260px] gap-4">
          {/* Columna izquierda: Más vendidos */}
          <aside className="order-2 lg:order-1">
            <SideBestSellers />
          </aside>

          {/* Contenido central */}
          <section className="order-1 lg:order-2">
            <article className="prose prose-emerald">
              <h1 className="!uppercase !font-extrabold tracking-wide">
                Sobre nosotros:
              </h1>

              <p>
                En <strong>Zona Natural</strong> creemos que lo simple es lo que
                mejor hace bien. Trabajamos con marcas y productores que
                comparten nuestros valores para acercarte productos naturales,
                saludables y ricos.
              </p>

              <h2 className="!uppercase !font-bold tracking-wide">
                Nuestra historia:
              </h2>
              <p>
                Nacimos con la idea de facilitar el acceso a alimentos reales y
                opciones más conscientes para todos los días. Empezamos con un
                catálogo chico y hoy seguimos creciendo gracias a tu confianza,
                manteniendo el foco en la calidad y la atención.
              </p>

              <h2 className="!uppercase !font-bold tracking-wide">
                Qué nos mueve:
              </h2>
              <ul>
                <li>Selección cuidada de productos y precios justos.</li>
                <li>Servicio cercano y envíos ágiles en Montevideo.</li>
                <li>Comunicación clara de ingredientes y orígenes.</li>
              </ul>
            </article>

            {/* Mapa + horarios con tabs (igual a la landing) */}
            <div className="mt-8">
              {/* 🔧 Solo Las Piedras y La Paz */}
              <MapHours
                locations={branches.filter(
                  (b) => b.name === "Las Piedras" || b.name === "La Paz"
                )}
              />
            </div>

            {/* Opiniones simples */}
            <div className="mt-8">
              <h2 className="text-2xl font-semibold">Opiniones de clientes</h2>
              <p className="mt-1 text-sm text-gray-600">
                Gracias por la confianza de cada día 💚
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <blockquote className="rounded-xl ring-1 ring-emerald-100 bg-white p-4">
                  <div className="font-medium">Natalia</div>
                  <p className="text-sm text-gray-600">
                    Muy buena atención y variedad de productos.
                  </p>
                </blockquote>
                <blockquote className="rounded-xl ring-1 ring-emerald-100 bg-white p-4">
                  <div className="font-medium">Pablo</div>
                  <p className="text-sm text-gray-600">
                    Entrega rapidísima y todo impecable.
                  </p>
                </blockquote>
              </div>
            </div>
          </section>

          {/* Columna derecha: Ofertas (desde /api/public/sidebar-offers) */}
          <aside className="order-3">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 space-y-3">
              <h2 className="text-lg font-semibold">Ofertas</h2>

              {!offers.length && (
                <p className="text-sm text-gray-500">
                  No hay productos para mostrar.
                </p>
              )}

              {offers.length > 0 && (
                <ul className="space-y-3">
                  {offers.map((o) => {
                    const hasDiscount =
                      typeof o.price === "number" &&
                      typeof o.priceOriginal === "number" &&
                      (o.priceOriginal ?? 0) > (o.price ?? 0);

                    return (
                      <li key={o.id}>
                        <a
                          href={`/producto/${o.slug}`}
                          className="flex items-center gap-3 group"
                        >
                          {o.imageUrl && (
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border bg-gray-50">
                              <img
                                src={o.imageUrl}
                                alt={o.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="text-sm font-medium leading-snug group-hover:text-emerald-700">
                              {o.name}
                            </div>

                            {typeof o.price === "number" && (
                              <div className="mt-0.5 text-xs">
                                {hasDiscount &&
                                typeof o.priceOriginal === "number" ? (
                                  <>
                                    <span className="mr-1 line-through text-gray-400">
                                      $
                                      {o.priceOriginal.toLocaleString("es-UY")}
                                    </span>
                                    <span className="font-semibold text-emerald-700">
                                      ${o.price.toLocaleString("es-UY")}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-semibold text-emerald-700">
                                    ${o.price.toLocaleString("es-UY")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>

      <WhatsAppFloat />
    </>
  );
}
