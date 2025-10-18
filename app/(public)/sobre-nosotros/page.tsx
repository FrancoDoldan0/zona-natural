// app/(public)/sobre-nosotros/page.tsx
export const runtime = "edge";

import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";
import WhatsAppFloat from "@/components/landing/WhatsAppFloat";
import MapHours, { type Branch } from "@/components/landing/MapHours";

// --- Sucursales: igual que en la landing ---
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

// Bloques laterales en cliente (fetch en el navegador)
import {
  SideBestSellers,
  SideOffers,
} from "@/components/sobre-nosotros/SideRails";

export default function SobreNosotrosPage() {
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
              <h1>Sobre nosotros</h1>
              <p>
                En <strong>Zona Natural</strong> creemos que lo simple es lo que
                mejor hace bien. Trabajamos con marcas y productores que
                comparten nuestros valores para acercarte productos naturales,
                saludables y ricos.
              </p>

              <h2>Nuestra historia</h2>
              <p>
                Nacimos con la idea de facilitar el acceso a alimentos reales y
                opciones más conscientes para todos los días. Empezamos con un
                catálogo chico y hoy seguimos creciendo gracias a tu confianza,
                manteniendo el foco en la calidad y la atención.
              </p>

              <h2>Qué nos mueve</h2>
              <ul>
                <li>Selección cuidada de productos y precios justos.</li>
                <li>Servicio cercano y envíos ágiles en Montevideo.</li>
                <li>Comunicación clara de ingredientes y orígenes.</li>
              </ul>
            </article>

            {/* Mapa + horarios con tabs (igual a la landing) */}
            <div className="mt-8">
              <MapHours locations={branches} />
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
                  <p className="mt-2 text-sm text-gray-700">
                    Me asesoraron súper bien y encontré todo para mis recetas.
                    ¡Llegó rapidísimo!
                  </p>
                </blockquote>
                <blockquote className="rounded-xl ring-1 ring-emerald-100 bg-white p-4">
                  <div className="font-medium">Andrés</div>
                  <p className="mt-2 text-sm text-gray-700">
                    Muy buena calidad y variedad. Pedí por la web y el envío
                    fue puntual.
                  </p>
                </blockquote>
              </div>
            </div>
          </section>

          {/* Columna derecha: Ofertas */}
          <aside className="order-3">
            <SideOffers />
          </aside>
        </div>
      </main>

      <WhatsAppFloat />
    </>
  );
}
