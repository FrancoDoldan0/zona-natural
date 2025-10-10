// components/landing/MapHours.tsx
import React from "react";

type HoursRow = [day: string, hours: string];

export default function MapHours({
  mapsUrl = "https://www.google.com/maps/search/?api=1&query=Zona+Natural+Las+Piedras+Canelones",
  embedUrl = "https://www.google.com/maps?q=Zona%20Natural%20Las%20Piedras%20Av%20Artigas%20600&output=embed",
  address = "Av. Artigas 600 esquina Rivera, Las Piedras, Canelones.",
  hours = [
    ["Lun–Vie", "09:00–19:00"],
    ["Sábado", "09:00–13:00"],
    ["Domingo", "Cerrado"],
  ] as HoursRow[],
}: {
  mapsUrl?: string;
  embedUrl?: string;
  address?: string;
  hours?: HoursRow[];
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl md:text-2xl font-semibold">¿Dónde estamos?</h2>
          <p className="text-sm text-gray-700">{address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm text-emerald-800 underline"
          >
            Abrir en Google Maps
          </a>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {hours.map(([d, h]) => (
              <div
                key={d}
                className="flex items-center justify-between rounded-lg bg-emerald-50/40 ring-1 ring-emerald-100 px-3 py-2"
              >
                <span>{d}</span>
                <span className="font-medium">{h}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            Los horarios pueden variar. Verifica en{" "}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google
            </a>
            .
          </p>
        </div>

        {/* Embed de Google Maps con aspecto fijo para evitar CLS */}
        <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-emerald-100">
          <div className="aspect-[4/3] md:aspect-[16/9]">
            <iframe
              title="Mapa de Zona Natural"
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
