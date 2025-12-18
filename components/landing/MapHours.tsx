// components/landing/MapHours.tsx
"use client";

import React, { useState } from "react";

export type HoursRow = [day: string, hours: string];

export type Branch = {
  name: string;
  address: string;
  mapsUrl: string;
  embedUrl: string;
  hours: HoursRow[];
};

type Props = {
  locations?: Branch[];
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
    hours: props.hours && props.hours.length ? props.hours : DEFAULT_HOURS,
  };

  const locations: Branch[] =
    props.locations && props.locations.length ? props.locations : [mono];

  const [active, setActive] = useState(0);
  const i = Math.min(Math.max(0, active), locations.length - 1);
  const current = locations[i];

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-white">
          ¿Dónde estamos?
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">{current.address}</p>
            <a
              href={current.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-emerald-400 underline"
            >
              Abrir en Google Maps
            </a>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {current.hours.map(([d, h]) => (
                <div
                  key={d}
                  className="flex items-center justify-between rounded-lg bg-zinc-900 ring-1 ring-emerald-900/40 px-3 py-2 text-zinc-200"
                >
                  <span>{d}</span>
                  <span className="font-medium">{h}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-500">
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

          <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-emerald-900/40">
            <div className="aspect-[4/3] md:aspect-[16/9]">
              <iframe
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
