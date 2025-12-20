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
    hours:
      props.hours && props.hours.length
        ? props.hours
        : DEFAULT_HOURS,
  };

  const locations: Branch[] =
    props.locations && props.locations.length > 0
      ? props.locations
      : [mono];

  const [active, setActive] = useState(0);

  const i = Math.min(Math.max(0, active), locations.length - 1);
  const current = locations[i];
  const showTabs = locations.length > 1;

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 text-emerald-400">
          ¿Dónde estamos?
        </h2>

        {/* Tabs sucursales */}
        {showTabs && (
          <div className="mb-4 overflow-x-auto no-scrollbar">
            <div className="inline-flex gap-2">
              {locations.map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => setActive(idx)}
                  aria-pressed={idx === i}
                  className={
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm ring-1 transition " +
                    (idx === i
                      ? "bg-emerald-600 text-black ring-emerald-600"
                      : "bg-neutral-900 text-emerald-400 ring-neutral-700 hover:bg-neutral-800")
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
            <p className="text-sm text-gray-300">
              {current.address}
            </p>

            <a
              href={current.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-emerald-400 underline"
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
                  className="flex items-center justify-between rounded-lg
                  bg-neutral-900 ring-1 ring-neutral-700
                  px-3 py-2"
                >
                  <span className="text-gray-300">{d}</span>
                  <span className="font-medium text-emerald-400">
                    {h}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Los horarios pueden variar. Verificá en{" "}
              <a
                href={current.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-emerald-400"
              >
                Google
              </a>
              .
            </p>
          </div>

          {/* Mapa */}
          <div className="relative w-full overflow-hidden rounded-2xl ring-1 ring-neutral-700 bg-black">
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
