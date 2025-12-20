"use client";

import React, { useState } from "react";

export type HoursRow = [day: string, hours: string];

export type Branch = {
  name: string;
  address: string;
  mapsUrl: string;   // Link a Google Maps (Cómo llegar)
  embedUrl: string;  // URL del iframe (output=embed)
  hours: HoursRow[];
};

type Props = {
  // Preferido: múltiples sucursales
  locations?: Branch[];

  // Compatibilidad: una sola sucursal
  mapsUrl?: string;
  embedUrl?: string;
  address?: string;
  hours?: HoursRow[];
};

const DEFAULT_HOURS: HoursRow[] = [
  ["Lun–Vie", "09:00–19:00"],
  ["Sábado", "09:00–13:00"],
  ["Domingo", "Cerrado"],
];

export default function MapHours(props: Props) {
  // Normalizamos SIEMPRE a un array
  const mono: Branch = {
    name: "Sucursal",
    address:
      props.address ??
      "Av. Artigas 600 esquina Rivera, Las Piedras, Canelones.",
    mapsUrl:
      props.mapsUrl ??
      "https://www.google.com/maps/search/?api=1&query=Zona+Natural+Las+Piedras+Canelones",
    embedUrl:
      props.embedUrl ??
      "https://www.google.com/maps?q=Zona%20Natural%20Las%20Piedras%20Av%20Artigas%20600&output=embed",
    hours:
      props.hours && props.hours.length
        ? props.hours
        : DEFAULT_HOURS,
  };

  const locations: Branch[] =
    props.locations && props.locations.length > 0
      ? props.locations
      : [mono];

  // Hook siempre en el tope
  const [active, setActive] = useState(0);

  const i = Math.min(Math.max(0, active), locations.length - 1);
  const current = locations[i];
  const showTabs = locations.length > 1;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">
          ¿Dónde estamos?
        </h2>

        {/* Tabs de sucursales */}
        {showTabs && (
          <div className="mb-4 overflow-x-auto no-scrollbar">
            <div className="inline-flex gap-2">
              {locations.map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => setActive(idx)}
                  aria-pressed={idx === i}
                  className={
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1 " +
                    (idx === i
                      ? "bg-emerald-700 text-white ring-emerald-700"
                      : "bg-white text-emerald-800 ring-emerald-200 hover:bg-emerald-50")
                  }
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Info y horarios */}
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              {current.address}
            </p>

            <a
              href={current.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-emerald-800 underline"
            >
              Abrir en Google Maps
            </a>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {(current.hours?.length
                ? current.hours
                : DEFAULT_HOURS
              ).map(([d, h]) => (
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
              Los horarios pueden variar. Verificá en{" "}
              <a
                href={current.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google
              </a>
              .
            </p>
          </div>

          {/* Mapa */}
          <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] md:aspect-[16/9]">
              <iframe
                key={i}
                title={`Mapa ${current.name}`}
                src={current.embedUrl}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
