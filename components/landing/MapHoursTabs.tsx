// components/landing/MapHoursTabs.tsx
"use client";

import { useMemo, useState } from "react";

type Branch = {
  name: string;
  address: string;
  mapsUrl: string;
  embedUrl: string;
  hours: [string, string][];
};

const enc = (s: string) => encodeURIComponent(s);

const DEFAULT_HOURS: [string, string][] = [
  ["Lun–Vie", "09:00–19:00"],
  ["Sábado", "09:00–13:00"],
  ["Domingo", "Cerrado"],
];

const BRANCHES: Branch[] = [
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
    hours: DEFAULT_HOURS,
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
    hours: DEFAULT_HOURS,
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
    hours: DEFAULT_HOURS,
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
    hours: DEFAULT_HOURS,
  },
];

export default function MapHoursTabs({ branches = BRANCHES }: { branches?: Branch[] }) {
  const [active, setActive] = useState(0);
  const b = useMemo(
    () => branches[Math.max(0, Math.min(active, branches.length - 1))],
    [branches, active]
  );

  return (
    <div className="rounded-2xl bg-white p-4">
      <h2 className="text-2xl md:text-3xl font-semibold mb-3">¿Dónde estamos?</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {branches.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setActive(i)}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 hover:bg-emerald-50 ${
              i === active
                ? "bg-emerald-700 text-white ring-emerald-700"
                : "ring-emerald-200 text-emerald-700"
            }`}
            aria-pressed={i === active}
          >
            {x.name}
          </button>
        ))}
      </div>

      {/* Address + hours + map */}
      <div className="mt-3 grid gap-6 md:grid-cols-[1fr_560px]">
        <div className="min-w-0">
          <p className="text-gray-700">{b.address}</p>
          <p className="mt-1">
            <a
              href={b.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline"
            >
              Abrir en Google Maps
            </a>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {b.hours.map(([label, value]) => (
              <div
                key={label}
                className={`rounded-lg px-3 py-1 ring-1 ${
                  /cerrado/i.test(value)
                    ? "ring-emerald-100 text-gray-500 bg-emerald-50/40"
                    : "ring-emerald-200 bg-emerald-50/40"
                }`}
              >
                <span className="text-sm">
                  <span className="mr-2 opacity-80">{label}</span>
                  <strong className="font-medium">{value}</strong>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Los horarios pueden variar. Verificá en{" "}
            <a
              href="https://www.google.com/search?q=Zona+Natural+Las+Piedras"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google
            </a>
            .
          </p>
        </div>

        {/* Mapa: borde sutil y sin “ring” extra */}
        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-emerald-100 shadow-sm bg-white">
          <iframe
            title={`Mapa ${b.name}`}
            src={b.embedUrl}
            className="w-full h-full"
            loading="lazy"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
