// app/(public)/sobre-nosotros/page.tsx
export const runtime = "edge";

import type { Metadata } from "next";
import InfoBar from "@/components/landing/InfoBar";
import Header from "@/components/landing/Header";
import MainNav from "@/components/landing/MainNav";

export const metadata: Metadata = {
  title: "Sobre nosotros – Zona Natural",
  description:
    "Conocé la historia de Zona Natural: productos naturales, saludables y ricos para tu día a día.",
};

const MAP_QUERY = "Zona Natural, Montevideo"; // Cambiá por la dirección exacta si querés
const MAP_EMBED_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=15&output=embed`;
const MAP_LINK = `https://maps.google.com/?q=${encodeURIComponent(MAP_QUERY)}`;
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

export default function SobreNosotrosPage() {
  return (
    <>
      {/* Header con buscador */}
      <InfoBar />
      <Header />
      <MainNav />

      {/* Contenido */}
      <main className="mx-auto max-w-5xl px-4 py-10">
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

        {/* Ubicación */}
        <section className="mt-10 not-prose">
          <h2 className="text-2xl font-semibold">Dónde estamos</h2>
          <p className="mt-1 text-sm text-gray-600">
            Estamos en <strong>Montevideo</strong>. Abrí el mapa para ver cómo llegar o
            escribinos por WhatsApp si necesitás ayuda.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr,1fr]">
            <div className="aspect-video overflow-hidden rounded-xl ring-1 ring-emerald-100 bg-emerald-50">
              <iframe
                title="Mapa — Zona Natural"
                src={MAP_EMBED_SRC}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="rounded-xl ring-1 ring-emerald-100 p-4 bg-white space-y-3">
              <div>
                <div className="text-sm text-gray-500">Buscar en Google Maps</div>
                <a
                  href={MAP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline"
                >
                  {MAP_QUERY}
                </a>
              </div>

              <div className="pt-2 border-t border-emerald-100">
                <div className="text-sm text-gray-500">Contacto</div>
                <div className="mt-1 space-x-3">
                  <a href={`tel:+${PHONE_E164}`} className="text-emerald-700 hover:underline">
                    Teléfono
                  </a>
                  <span className="text-gray-300">•</span>
                  <a
                    href={`https://wa.me/${PHONE_E164}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    WhatsApp
                  </a>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Envíos en Montevideo. Consultá por horarios y retiros.
                </p>
              </div>
            </div>
          </div>
        </section>

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
    </>
  );
}
