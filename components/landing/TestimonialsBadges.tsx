// components/landing/TestimonialsBadges.tsx
import React from "react";

type Testimonial = { quote: string; author: string };

export default function TestimonialsBadges({
  reviewsUrl = "https://www.google.com/maps/search/?api=1&query=Zona+Natural+Las+Piedras+Canelones",
  badges = ["Productos a granel", "Envíos Montevideo", "Atención personalizada"],
  testimonials = [
    { quote: "Me asesoraron súper bien y encontré todo para mis recetas. Llegó rapidísimo.", author: "Natalia" },
    { quote: "Gran variedad y precios claros. Volveré a comprar.", author: "Rodrigo" },
  ],
}: {
  reviewsUrl?: string;
  badges?: string[];
  testimonials?: Testimonial[];
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card Google + badges */}
          <div className="rounded-2xl ring-1 ring-emerald-100 p-6 bg-emerald-50/40">
            <div className="flex items-center gap-3">
              {/* Google “G” inline para no depender de archivos extra */}
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6">
                <path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.7-2.6-5.7-5.8s2.6-5.8 5.7-5.8c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 4.2 14.6 3.2 12 3.2 6.9 3.2 2.8 7.3 2.8 12.4s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6 0-1-.1-1.6H12z"/>
              </svg>
              <p className="text-sm">
                Leé nuestras opiniones reales en{" "}
                <a
                  href={reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-emerald-800"
                >
                  Google
                </a>
                .
              </p>
            </div>

            <a
              href={reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Ver opiniones en Google
            </a>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-900/80">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white ring-1 ring-emerald-100 px-2 py-1"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Testimonios (texto propio, no cita literal de Google) */}
          {testimonials.slice(0, 2).map((t, i) => (
            <div key={i} className="rounded-2xl ring-1 ring-emerald-100 p-6">
              <p className="text-sm text-gray-800">“{t.quote}” — <span className="font-medium">{t.author}</span></p>
              <div className="mt-3 flex gap-1" aria-hidden>
                {"★★★★★".split("").map((s, j) => (
                  <span key={j} className="text-emerald-600">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
